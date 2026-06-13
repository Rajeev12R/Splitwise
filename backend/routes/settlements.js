import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { groupId, payerId, payeeId, amount } = req.body;
    const userId = req.user.id;

    if (!groupId || !payerId || !payeeId || !amount) {
      return res.status(400).json({ error: 'Missing required settlement fields' });
    }

    const numericAmount = Number(Number(amount).toFixed(2));
    if (numericAmount <= 0) {
      return res.status(400).json({ error: 'Settlement amount must be greater than zero' });
    }

    const isMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const payerMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: payerId } }
    });
    const payeeMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: payeeId } }
    });

    if (!payerMember || !payeeMember) {
      return res.status(400).json({ error: 'Payer and Payee must be members of the group' });
    }

    const settlement = await prisma.settlement.create({
      data: {
        groupId,
        payerId,
        payeeId,
        amount: numericAmount
      },
      include: {
        payer: { select: { id: true, name: true, email: true } },
        payee: { select: { id: true, name: true, email: true } }
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`room:group:${groupId}`).emit('group_updated');
    }

    res.status(201).json(settlement);
  } catch (error) {
    console.error('Create settlement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
