// controllers/telegram/verifyTelegramAuth.ts

import prisma from '../prisma-client';
import expressAsyncHandler from 'express-async-handler';

export const verifyTelegramAuth = expressAsyncHandler(async (req, res) => {
  const { token, telegramChatId, telegramUsername } = req.body;

  if (!token || !telegramChatId) {
    res.status(400).json({ message: 'Missing token or Telegram chat ID' });
    return;
  }

  const user = await prisma.user.findFirst({ where: { tgAuthToken: token } });
  if (!user) {
    res.status(404).json({ message: 'Invalid or expired token' });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      telegramChatId: telegramChatId.toString(),
      telegramUsername,
      tgAuthToken: null,
    },
  });

  res.status(200).json({ message: 'Telegram linked successfully' });
});
