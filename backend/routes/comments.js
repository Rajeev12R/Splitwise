import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/:expenseId', authenticateToken, async (req, res) => {
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
      return res.status(403).json({ error: 'You do not have access to this expense' });
    }

    const comments = await prisma.comment.findMany({
      where: { expenseId },
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { expenseId, content } = req.body;
    const userId = req.user.id;

    if (!expenseId || !content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

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
      return res.status(403).json({ error: 'You do not have access to this expense' });
    }

    const comment = await prisma.comment.create({
      data: {
        expenseId,
        userId,
        content: content.trim()
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    const io = req.app.get('io');
    if (io) {
      const roomName = `room:expense:${expenseId}`;
      io.to(roomName).emit('comment_received', comment);
    }

    res.status(201).json(comment);
  } catch (error) {
    console.error('Post comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
