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

export default router;
