import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                }
              }
            },
            expenses: {
              include: {
                splits: true
              }
            },
            settlements: true
          }
        }
      }
    });

    const groups = memberships.map(m => {
      const g = m.group;

      const paid = g.expenses
        .filter(e => e.payerId === userId)
        .reduce((sum, e) => sum + e.amount, 0);

      const owed = g.expenses.reduce((sum, e) => {
        const split = e.splits.find(s => s.userId === userId);
        return sum + (split ? split.amount : 0);
      }, 0);

      const sent = g.settlements
        .filter(s => s.payerId === userId)
        .reduce((sum, s) => sum + s.amount, 0);

      const received = g.settlements
        .filter(s => s.payeeId === userId)
        .reduce((sum, s) => sum + s.amount, 0);

      const userNetBalance = Number((paid - owed + sent - received).toFixed(2));

      return {
        id: g.id,
        name: g.name,
        description: g.description,
        creatorId: g.creatorId,
        createdAt: g.createdAt,
        membersCount: g.members.length,
        userNetBalance
      };
    });

    res.json(groups);
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const userId = req.user.id;

    const group = await prisma.$transaction(async (tx) => {
      const g = await tx.group.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          creatorId: userId
        }
      });

      await tx.groupMember.create({
        data: {
          groupId: g.id,
          userId: userId
        }
      });

      return g;
    });

    res.status(201).json(group);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId }
      }
    });

    if (!member) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        expenses: {
          include: {
            payer: { select: { id: true, name: true, email: true } },
            splits: {
              include: {
                user: { select: { id: true, name: true, email: true } }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        settlements: {
          include: {
            payer: { select: { id: true, name: true, email: true } },
            payee: { select: { id: true, name: true, email: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const balances = {};

    group.members.forEach(m => {
      balances[m.user.id] = {
        user: m.user,
        paid: 0,
        owed: 0,
        sentSettlements: 0,
        receivedSettlements: 0,
        netBalance: 0
      };
    });

    group.expenses.forEach(exp => {
      if (balances[exp.payerId]) {
        balances[exp.payerId].paid += exp.amount;
      }

      exp.splits.forEach(split => {
        if (balances[split.userId]) {
          balances[split.userId].owed += split.amount;
        }
      });
    });

    group.settlements.forEach(set => {
      if (balances[set.payerId]) {
        balances[set.payerId].sentSettlements += set.amount;
      }
      if (balances[set.payeeId]) {
        balances[set.payeeId].receivedSettlements += set.amount;
      }
    });

    const membersList = [];
    Object.keys(balances).forEach(id => {
      const b = balances[id];
      b.netBalance = Number((b.paid - b.owed + b.sentSettlements - b.receivedSettlements).toFixed(2));
      membersList.push(b);
    });

    const debtors = [];
    const creditors = [];

    membersList.forEach(m => {
      if (m.netBalance < -0.01) {
        debtors.push({ userId: m.user.id, name: m.user.name, email: m.user.email, balance: m.netBalance });
      } else if (m.netBalance > 0.01) {
        creditors.push({ userId: m.user.id, name: m.user.name, email: m.user.email, balance: m.netBalance });
      }
    });

    debtors.sort((a, b) => a.balance - b.balance);
    creditors.sort((a, b) => b.balance - a.balance);

    const simplifiedDebts = [];
    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];

      const amountToSettle = Math.min(Math.abs(debtor.balance), creditor.balance);

      simplifiedDebts.push({
        from: { id: debtor.userId, name: debtor.name, email: debtor.email },
        to: { id: creditor.userId, name: creditor.name, email: creditor.email },
        amount: Number(amountToSettle.toFixed(2))
      });

      debtor.balance += amountToSettle;
      creditor.balance -= amountToSettle;

      if (Math.abs(debtor.balance) < 0.01) {
        dIdx++;
      }
      if (creditor.balance < 0.01) {
        cIdx++;
      }
    }

    res.json({
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        creatorId: group.creatorId,
        createdAt: group.createdAt
      },
      members: membersList,
      expenses: group.expenses,
      settlements: group.settlements,
      debts: simplifiedDebts
    });

  } catch (error) {
    console.error('Get group details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:groupId/members', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { email } = req.body;
    const userId = req.user.id;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const isMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId }
      }
    });

    if (!isMember) {
      return res.status(403).json({ error: 'You are not authorized to add members to this group' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!targetUser) {
      return res.status(404).json({ error: `User with email ${email} not registered in our app.` });
    }

    const existingMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId: targetUser.id }
      }
    });

    if (existingMembership) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }

    const newMember = await prisma.groupMember.create({
      data: {
        groupId,
        userId: targetUser.id
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`room:group:${groupId}`).emit('group_updated');
    }

    res.status(201).json(newMember);
  } catch (error) {
    console.error('Add group member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:groupId/members/:targetUserId', authenticateToken, async (req, res) => {
  try {
    const { groupId, targetUserId } = req.params;
    const userId = req.user.id;

    const senderMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId }
      }
    });

    if (!senderMembership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const targetMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId: targetUserId }
      }
    });

    if (!targetMembership) {
      return res.status(404).json({ error: 'Member not found in this group' });
    }

    const expensesPaid = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: { groupId, payerId: targetUserId }
    });

    const splitsOwed = await prisma.expenseSplit.aggregate({
      _sum: { amount: true },
      where: {
        userId: targetUserId,
        expense: { groupId }
      }
    });

    const settlementsSent = await prisma.settlement.aggregate({
      _sum: { amount: true },
      where: { groupId, payerId: targetUserId }
    });

    const settlementsReceived = await prisma.settlement.aggregate({
      _sum: { amount: true },
      where: { groupId, payeeId: targetUserId }
    });

    const paid = expensesPaid._sum.amount || 0;
    const owed = splitsOwed._sum.amount || 0;
    const sent = settlementsSent._sum.amount || 0;
    const received = settlementsReceived._sum.amount || 0;

    const netBalance = Number((paid - owed + sent - received).toFixed(2));

    if (Math.abs(netBalance) > 0.01) {
      return res.status(400).json({
        error: `Cannot remove member. User has an active balance of ${netBalance > 0 ? '+' : ''}${netBalance}. They must settle up first.`
      });
    }

    await prisma.groupMember.delete({
      where: {
        groupId_userId: { groupId, userId: targetUserId }
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`room:group:${groupId}`).emit('group_updated');
    }

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove group member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
