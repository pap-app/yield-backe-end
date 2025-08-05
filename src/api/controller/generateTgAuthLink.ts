// controllers/telegram/startTelegramAuth.ts
import { nanoid } from 'nanoid';
import prisma from '../prisma-client';

export const generateTgLinkAuth = async (req, res) => {
  const { walletAddress } = req.body;

  if (!walletAddress) {
    return res.status(400).json({ message: 'Missing wallet address' });
  }

  const user = await prisma.user.findUnique({ where: { walletAddress } });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const token = nanoid(16); // temp 1-time token

  await prisma.user.update({
    where: { walletAddress },
    data: { tgAuthToken: token },
  });

  const botUsername = 'defi_yield_hunter_bot'; // without @
  const telegramLink = `https://t.me/${botUsername}?start=${token}`;

  res.json({ url: telegramLink });
};
