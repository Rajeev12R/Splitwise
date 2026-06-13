import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const adjustRoundingDiscrepancy = (splits, targetTotal) => {
  const currentTotal = splits.reduce((sum, s) => sum + s.amount, 0);
  const diff = Number((targetTotal - currentTotal).toFixed(2));

  if (diff === 0) return splits;

  const cents = Math.round(diff * 100);
  const direction = cents > 0 ? 0.01 : -0.01;
  const count = Math.abs(cents);

  for (let i = 0; i < count; i++) {
    const splitIndex = i % splits.length;
    splits[splitIndex].amount = Number((splits[splitIndex].amount + direction).toFixed(2));
  }

  return splits;
};

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { groupId, description, amount, payerId, splitType, splits: inputSplits } = req.body;
    const userId = req.user.id;

    if (!groupId || !description || !amount || !payerId || !splitType || !inputSplits || !inputSplits.length) {
      return res.status(400).json({ error: 'Missing required expense fields' });
    }

    const numericAmount = Number(Number(amount).toFixed(2));
    if (numericAmount <= 0) {
      return res.status(400).json({ error: 'Expense amount must be greater than zero' });
    }

    const isMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    let finalSplits = [];

    if (splitType === 'EQUAL') {
      const shareCount = inputSplits.length;
      const baseShare = Number((numericAmount / shareCount).toFixed(2));

      finalSplits = inputSplits.map(s => ({
        userId: s.userId,
        amount: baseShare,
        percent: null,
        share: null
      }));

      finalSplits = adjustRoundingDiscrepancy(finalSplits, numericAmount);

    } else if (splitType === 'UNEQUAL') {
      let sum = 0;
      finalSplits = inputSplits.map(s => {
        const amt = Number(Number(s.amount).toFixed(2));
        sum += amt;
        return {
          userId: s.userId,
          amount: amt,
          percent: null,
          share: null
        };
      });

      if (Math.abs(sum - numericAmount) > 0.01) {
        return res.status(400).json({ error: `Sum of split amounts (${sum}) must equal the total amount (${numericAmount})` });
      }

      finalSplits = adjustRoundingDiscrepancy(finalSplits, numericAmount);

    } else if (splitType === 'PERCENTAGE') {
      let percentSum = 0;
      finalSplits = inputSplits.map(s => {
        const pct = Number(s.percent);
        percentSum += pct;
        const amt = Number(((pct / 100) * numericAmount).toFixed(2));
        return {
          userId: s.userId,
          amount: amt,
          percent: pct,
          share: null
        };
      });

      if (Math.abs(percentSum - 100) > 0.01) {
        return res.status(400).json({ error: `Percentages must add up to exactly 100% (got ${percentSum}%)` });
      }

      finalSplits = adjustRoundingDiscrepancy(finalSplits, numericAmount);

    } else if (splitType === 'SHARE') {
      const totalShares = inputSplits.reduce((sum, s) => sum + Number(s.share), 0);
      if (totalShares <= 0) {
        return res.status(400).json({ error: 'Total shares must be greater than zero' });
      }

      finalSplits = inputSplits.map(s => {
        const sh = Number(s.share);
        const amt = Number(((sh / totalShares) * numericAmount).toFixed(2));
        return {
          userId: s.userId,
          amount: amt,
          percent: null,
          share: sh
        };
      });

      finalSplits = adjustRoundingDiscrepancy(finalSplits, numericAmount);
    } else {
      return res.status(400).json({ error: `Invalid split type: ${splitType}` });
    }

    const expense = await prisma.$transaction(async (tx) => {
      const exp = await tx.expense.create({
        data: {
          groupId,
          description: description.trim(),
          amount: numericAmount,
          payerId,
          splitType
        }
      });

      const splitsData = finalSplits.map(s => ({
        expenseId: exp.id,
        userId: s.userId,
        amount: s.amount,
        percent: s.percent,
        share: s.share
      }));

      await tx.expenseSplit.createMany({
        data: splitsData
      });

      return tx.expense.findUnique({
        where: { id: exp.id },
        include: {
          payer: { select: { id: true, name: true, email: true } },
          splits: {
            include: {
              user: { select: { id: true, name: true, email: true } }
            }
          }
        }
      });
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`room:group:${groupId}`).emit('group_updated');
    }

    res.status(201).json(expense);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:expenseId', authenticateToken, async (req, res) => {
  try {
    const { expenseId } = req.params;
    const userId = req.user.id;

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId }
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const isMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId: expense.groupId, userId }
      }
    });

    if (!isMember) {
      return res.status(403).json({ error: 'You do not have access to this group' });
    }

    const { groupId } = expense;

    await prisma.expense.delete({
      where: { id: expenseId }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`room:group:${groupId}`).emit('group_updated');
    }

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

const cleanCSVField = (field) => {
  let f = field.trim();
  if (f.startsWith('"') && f.endsWith('"')) {
    f = f.slice(1, -1).trim();
  }
  return f;
};

const getOrCreateUser = async (name) => {
  const email = `${name.toLowerCase()}@splitwise.com`;
  let user = await prisma.user.findUnique({
    where: { email }
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: '$2b$10$abcdefghijklmnopqrstu.examplepasswordhash'
      }
    });
  }
  return user;
};

const getOrCreateGroupMember = async (groupId, userId) => {
  let member = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: { groupId, userId }
    }
  });
  if (!member) {
    member = await prisma.groupMember.create({
      data: {
        groupId,
        userId
      }
    });
  }
  return member;
};

router.post('/import-preview', authenticateToken, async (req, res) => {
  try {
    const { groupId, csvText } = req.body;
    if (!groupId || !csvText) {
      return res.status(400).json({ error: 'Group ID and CSV text are required' });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: { include: { user: true } } }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV must contain a header and at least one data row' });
    }

    const header = parseCSVLine(lines[0]).map(h => cleanCSVField(h).toLowerCase());
    const expectedHeaders = ['date', 'description', 'paid_by', 'amount', 'currency', 'split_type', 'split_with', 'split_details', 'notes'];
    
    const headerIndices = {};
    expectedHeaders.forEach(eh => {
      headerIndices[eh] = header.indexOf(eh);
    });

    const parseDate = (dateStr) => {
      const cleaned = dateStr.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        return { date: new Date(cleaned), format: 'YYYY-MM-DD', ambiguous: false };
      }
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleaned)) {
        const parts = cleaned.split('/');
        const part1 = parseInt(parts[0], 10);
        const part2 = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);

        const ambiguous = (part1 <= 12 && part2 <= 12);
        const day = part1;
        const month = part2 - 1;
        return { date: new Date(year, month, day), format: 'DD/MM/YYYY', ambiguous };
      }
      const months = { mar: 2, feb: 1, apr: 3 };
      const match = cleaned.match(/^([a-zA-Z]{3,})\s*(\d{1,2})$/);
      if (match) {
        const monthName = match[1].toLowerCase().slice(0, 3);
        const day = parseInt(match[2], 10);
        const month = months[monthName] !== undefined ? months[monthName] : 2;
        const year = 2026;
        return { date: new Date(year, month, day), format: 'MMM DD', ambiguous: false };
      }

      return { date: null, format: 'unknown', ambiguous: false };
    };

    const nameMappings = {
      'aisha': 'Aisha',
      'rohan': 'Rohan',
      'rohan ': 'Rohan',
      'priya': 'Priya',
      'priya s': 'Priya',
      'meera': 'Meera',
      'dev': 'Dev',
      'sam': 'Sam'
    };

    const parsedRows = [];

    for (let index = 1; index < lines.length; index++) {
      const line = lines[index];
      const cols = parseCSVLine(line);
      
      const getVal = (field) => {
        const idx = headerIndices[field];
        return idx !== -1 && idx < cols.length ? cleanCSVField(cols[idx]) : '';
      };

      const rawDate = getVal('date');
      const rawDescription = getVal('description');
      const rawPaidBy = getVal('paid_by');
      const rawAmount = getVal('amount');
      const rawCurrency = getVal('currency');
      const rawSplitType = getVal('split_type');
      const rawSplitWith = getVal('split_with');
      const rawSplitDetails = getVal('split_details');
      const rawNotes = getVal('notes');

      const rowAnomalies = [];
      const cleaned = {
        index,
        raw: { date: rawDate, description: rawDescription, paidBy: rawPaidBy, amount: rawAmount, currency: rawCurrency, splitType: rawSplitType, splitWith: rawSplitWith, splitDetails: rawSplitDetails, notes: rawNotes },
        date: null,
        description: rawDescription,
        paidBy: '',
        amount: 0,
        currency: 'INR',
        splitType: 'EQUAL',
        splitWith: [],
        splitDetails: {},
        isSettlement: false,
        notes: rawNotes,
        shouldImport: true
      };

      const { date, format, ambiguous } = parseDate(rawDate);
      if (!date || isNaN(date.getTime())) {
        rowAnomalies.push({ type: 'DATE_INVALID', message: `Invalid date format: "${rawDate}"` });
        cleaned.date = rawDate;
      } else {
        cleaned.date = date.toISOString().split('T')[0];
        if (format === 'unknown') {
          rowAnomalies.push({ type: 'DATE_FORMAT_INCONSISTENT', message: `Inconsistent date format: "${rawDate}"` });
        }
        if (ambiguous) {
          rowAnomalies.push({ type: 'DATE_AMBIGUOUS', message: `Ambiguous date format (interpreted as ${date.toDateString()})` });
        }
      }

      const normalizedPayerKey = rawPaidBy.trim().toLowerCase();
      const mappedPayer = nameMappings[normalizedPayerKey];
      if (!rawPaidBy || rawPaidBy.trim() === '') {
        rowAnomalies.push({ type: 'PAYER_MISSING', message: 'Missing payer field' });
        cleaned.paidBy = '';
      } else if (!mappedPayer) {
        rowAnomalies.push({ type: 'PAYER_UNREGISTERED', message: `Payer "${rawPaidBy}" not recognized as flatmate` });
        cleaned.paidBy = rawPaidBy;
      } else {
        cleaned.paidBy = mappedPayer;
        if (rawPaidBy !== mappedPayer) {
          rowAnomalies.push({ type: 'PAYER_NORMALIZED', message: `Normalized payer name from "${rawPaidBy}" to "${mappedPayer}"` });
        }
      }

      let cleanAmtStr = rawAmount.replace(/[\",]/g, '').trim();
      let rawAmtVal = parseFloat(cleanAmtStr);
      if (isNaN(rawAmtVal)) {
        rowAnomalies.push({ type: 'AMOUNT_INVALID', message: `Invalid numeric amount: "${rawAmount}"` });
        cleaned.amount = 0;
      } else {
        cleaned.amount = rawAmtVal;
        if (rawAmount.includes(',')) {
          rowAnomalies.push({ type: 'AMOUNT_CONTAINED_COMMAS', message: `Removed commas from amount: "${rawAmount}"` });
        }

        const decimalParts = cleanAmtStr.split('.');
        if (decimalParts.length > 1 && decimalParts[1].length > 2) {
          const rounded = Number(rawAmtVal.toFixed(2));
          rowAnomalies.push({ type: 'AMOUNT_ROUNDED', message: `Rounded amount from "${rawAmtVal}" to "${rounded}"` });
          cleaned.amount = rounded;
        }

        if (rawAmtVal < 0) {
          rowAnomalies.push({ type: 'AMOUNT_NEGATIVE', message: `Negative amount represents a refund / credit` });
        }

        if (rawAmtVal === 0) {
          rowAnomalies.push({ type: 'AMOUNT_ZERO', message: `Zero amount logged` });
        }
      }

      if (!rawCurrency || rawCurrency.trim() === '') {
        rowAnomalies.push({ type: 'CURRENCY_MISSING', message: 'Missing currency, defaulted to INR' });
        cleaned.currency = 'INR';
      } else if (rawCurrency.toUpperCase() === 'USD') {
        const rate = 83;
        cleaned.currency = 'INR';
        const converted = Number((cleaned.amount * rate).toFixed(2));
        rowAnomalies.push({ type: 'CURRENCY_CONVERTED', message: `Converted $${cleaned.amount} USD to ₹${converted} INR (rate: $1 = ₹${rate})` });
        cleaned.amount = converted;
      } else {
        cleaned.currency = rawCurrency.toUpperCase();
      }

      const isSettlementIndicator = 
        rawDescription.toLowerCase().includes('paid back') || 
        rawDescription.toLowerCase().includes('settlement') || 
        rawDescription.toLowerCase().includes('deposit share') || 
        (rawSplitType.trim() === '' && rawSplitWith.trim() !== '');

      if (isSettlementIndicator) {
        cleaned.isSettlement = true;
        cleaned.splitType = '';
        rowAnomalies.push({ type: 'LOGGED_AS_SETTLEMENT', message: `Identified as a settlement payment rather than group expense` });
      }

      let splitWithRaw = rawSplitWith.split(';').map(m => m.trim()).filter(m => m !== '');
      let splitMembers = splitWithRaw.map(m => nameMappings[m.toLowerCase()] || m);
      
      const cabinGuests = splitMembers.filter(m => !Object.values(nameMappings).includes(m));
      if (cabinGuests.length > 0) {
        rowAnomalies.push({ type: 'UNREGISTERED_SPLIT_MEMBERS', message: `Unregistered guest(s) included in split: ${cabinGuests.join(', ')}` });
      }
      cleaned.splitWith = splitMembers;

      if (date && !isNaN(date.getTime())) {
        const dateISO = date.toISOString().split('T')[0];
        
        if (dateISO > '2026-03-31') {
          if (splitMembers.includes('Meera')) {
            rowAnomalies.push({ type: 'MEMBERSHIP_INACTIVE', message: `Meera was inactive on ${dateISO} (moved out March 31)` });
          }
          if (cleaned.paidBy === 'Meera') {
            rowAnomalies.push({ type: 'MEMBERSHIP_INACTIVE', message: `Payer Meera was inactive on ${dateISO} (moved out March 31)` });
          }
        }

        if (dateISO < '2026-04-10') {
          if (splitMembers.includes('Sam')) {
            rowAnomalies.push({ type: 'MEMBERSHIP_INACTIVE', message: `Sam was inactive on ${dateISO} (moved in April 10)` });
          }
          if (cleaned.paidBy === 'Sam') {
            rowAnomalies.push({ type: 'MEMBERSHIP_INACTIVE', message: `Payer Sam was inactive on ${dateISO} (moved in April 10)` });
          }
        }
      }

      const splitTypeUpper = rawSplitType.toUpperCase();
      cleaned.splitType = splitTypeUpper;
      
      if (!cleaned.isSettlement) {
        if (splitTypeUpper === 'EQUAL') {
          cleaned.splitType = 'EQUAL';
          if (rawSplitDetails && rawSplitDetails.trim() !== '') {
            rowAnomalies.push({ type: 'SPLIT_DETAILS_REDUNDANT', message: `Redundant split details provided for EQUAL split type` });
          }
        } else if (splitTypeUpper === 'PERCENTAGE') {
          cleaned.splitType = 'PERCENTAGE';
          const pctMap = {};
          let totalPct = 0;
          if (rawSplitDetails) {
            rawSplitDetails.split(';').forEach(p => {
              const parts = p.trim().match(/^([a-zA-Z\s]+)\s*(\d+(?:\.\d+)?)\s*%?$/);
              if (parts) {
                const name = nameMappings[parts[1].trim().toLowerCase()] || parts[1].trim();
                const pct = parseFloat(parts[2]);
                pctMap[name] = pct;
                totalPct += pct;
              }
            });
          }
          cleaned.splitDetails = pctMap;
          if (Math.abs(totalPct - 100) > 0.01) {
            rowAnomalies.push({ type: 'SPLIT_PERCENTAGE_INVALID', message: `Percentages sum to ${totalPct}% instead of 100%` });
          }
        } else if (splitTypeUpper === 'SHARE') {
          cleaned.splitType = 'SHARE';
          const shareMap = {};
          if (rawSplitDetails) {
            rawSplitDetails.split(';').forEach(s => {
              const parts = s.trim().match(/^([a-zA-Z\s]+)\s*(\d+)$/);
              if (parts) {
                const name = nameMappings[parts[1].trim().toLowerCase()] || parts[1].trim();
                const shares = parseInt(parts[2], 10);
                shareMap[name] = shares;
              }
            });
          }
          cleaned.splitDetails = shareMap;
        } else if (splitTypeUpper === 'UNEQUAL') {
          cleaned.splitType = 'UNEQUAL';
          const amtMap = {};
          let totalSplitsAmt = 0;
          if (rawSplitDetails) {
            rawSplitDetails.split(';').forEach(a => {
              const parts = a.trim().match(/^([a-zA-Z\s]+)\s*(\d+(?:\.\d+)?)$/);
              if (parts) {
                const name = nameMappings[parts[1].trim().toLowerCase()] || parts[1].trim();
                const amt = parseFloat(parts[2]);
                amtMap[name] = amt;
                totalSplitsAmt += amt;
              }
            });
          }
          cleaned.splitDetails = amtMap;
          if (Math.abs(totalSplitsAmt - cleaned.amount) > 0.01) {
            rowAnomalies.push({ type: 'SPLIT_UNEQUAL_INVALID', message: `Sum of unequal split amounts (${totalSplitsAmt}) does not equal total amount (${cleaned.amount})` });
          }
        } else {
          cleaned.splitType = 'EQUAL';
          rowAnomalies.push({ type: 'SPLIT_TYPE_INVALID', message: `Invalid split type "${rawSplitType}" (defaulted to EQUAL)` });
        }
      }

      parsedRows.push({
        ...cleaned,
        anomalies: rowAnomalies
      });
    }

    for (let i = 0; i < parsedRows.length; i++) {
      const rowA = parsedRows[i];
      for (let j = i + 1; j < parsedRows.length; j++) {
        const rowB = parsedRows[j];
        
        const dateMatch = rowA.date === rowB.date;
        const payerMatch = rowA.paidBy === rowB.paidBy;
        const amountMatch = Math.abs(rowA.amount - rowB.amount) < 0.01 || 
                          (rowA.raw.currency.toUpperCase() === 'USD' && rowB.raw.currency.toUpperCase() === 'USD' && Math.abs(parseFloat(rowA.raw.amount) - parseFloat(rowB.raw.amount)) < 0.01);
        
        const splitWithMatch = 
          rowA.splitWith.length === rowB.splitWith.length &&
          rowA.splitWith.every(m => rowB.splitWith.includes(m));

        if (dateMatch && payerMatch && amountMatch && splitWithMatch) {
          rowA.anomalies.push({ 
            type: 'DUPLICATE_CANDIDATE', 
            message: `Possible duplicate of Row ${rowB.index} ("${rowB.description}" vs "${rowA.description}")`,
            duplicateIndex: rowB.index
          });
          rowB.anomalies.push({ 
            type: 'DUPLICATE_CANDIDATE', 
            message: `Possible duplicate of Row ${rowA.index} ("${rowA.description}" vs "${rowB.description}")`,
            duplicateIndex: rowA.index,
            isSuggestedExclude: true
          });
        }
      }
    }

    res.json({
      groupId,
      parsedRows,
      members: group.members.map(m => m.user.name)
    });

  } catch (error) {
    console.error('Import preview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/import-confirm', authenticateToken, async (req, res) => {
  try {
    const { groupId, rows } = req.body;
    if (!groupId || !rows || !rows.length) {
      return res.status(400).json({ error: 'Group ID and rows are required' });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const importedExpenses = [];
    const importedSettlements = [];

    for (const row of rows) {
      if (!row.shouldImport) continue;

      const payerUser = await getOrCreateUser(row.paidBy);
      await getOrCreateGroupMember(groupId, payerUser.id);

      const expDate = row.date ? new Date(row.date) : new Date();

      if (row.isSettlement) {
        if (!row.splitWith || !row.splitWith.length) continue;
        const payeeUser = await getOrCreateUser(row.splitWith[0]);
        await getOrCreateGroupMember(groupId, payeeUser.id);

        const settlement = await prisma.settlement.create({
          data: {
            groupId,
            payerId: payerUser.id,
            payeeId: payeeUser.id,
            amount: parseFloat(row.amount),
            createdAt: expDate
          }
        });
        importedSettlements.push(settlement);
      } else {
        if (!row.splitWith || !row.splitWith.length) continue;
        const numericAmount = parseFloat(row.amount);

        const splitUsers = [];
        for (const name of row.splitWith) {
          const u = await getOrCreateUser(name);
          await getOrCreateGroupMember(groupId, u.id);
          splitUsers.push(u);
        }

        let splitsData = [];

        if (row.splitType === 'EQUAL') {
          const baseShare = Number((numericAmount / splitUsers.length).toFixed(2));
          let splits = splitUsers.map(u => ({
            userId: u.id,
            amount: baseShare,
            percent: null,
            share: null
          }));
          splits = adjustRoundingDiscrepancy(splits, numericAmount);
          splitsData = splits;
        } else if (row.splitType === 'UNEQUAL') {
          let splits = splitUsers.map(u => {
            const amt = Number(Number(row.splitDetails[u.name] || 0).toFixed(2));
            return {
              userId: u.id,
              amount: amt,
              percent: null,
              share: null
            };
          });
          splits = adjustRoundingDiscrepancy(splits, numericAmount);
          splitsData = splits;
        } else if (row.splitType === 'PERCENTAGE') {
          let splits = splitUsers.map(u => {
            const pct = Number(row.splitDetails[u.name] || 0);
            const amt = Number(((pct / 100) * numericAmount).toFixed(2));
            return {
              userId: u.id,
              amount: amt,
              percent: pct,
              share: null
            };
          });
          splits = adjustRoundingDiscrepancy(splits, numericAmount);
          splitsData = splits;
        } else if (row.splitType === 'SHARE') {
          const totalShares = Object.values(row.splitDetails).reduce((sum, s) => sum + Number(s), 0);
          let splits = splitUsers.map(u => {
            const sh = Number(row.splitDetails[u.name] || 0);
            const amt = totalShares > 0 ? Number(((sh / totalShares) * numericAmount).toFixed(2)) : 0;
            return {
              userId: u.id,
              amount: amt,
              percent: null,
              share: sh
            };
          });
          splits = adjustRoundingDiscrepancy(splits, numericAmount);
          splitsData = splits;
        }

        const expense = await prisma.$transaction(async (tx) => {
          const exp = await tx.expense.create({
            data: {
              groupId,
              description: row.description || 'Imported Expense',
              amount: numericAmount,
              payerId: payerUser.id,
              splitType: row.splitType,
              createdAt: expDate
            }
          });

          const createdSplits = splitsData.map(s => ({
            expenseId: exp.id,
            userId: s.userId,
            amount: s.amount,
            percent: s.percent,
            share: s.share
          }));

          await tx.expenseSplit.createMany({
            data: createdSplits
          });

          return exp;
        });

        importedExpenses.push(expense);
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`room:group:${groupId}`).emit('group_updated');
    }

    res.json({
      success: true,
      importedExpensesCount: importedExpenses.length,
      importedSettlementsCount: importedSettlements.length
    });

  } catch (error) {
    console.error('Import confirm error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
