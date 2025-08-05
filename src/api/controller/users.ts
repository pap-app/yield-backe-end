import expressAsyncHandler from 'express-async-handler';
import prisma from '../prisma-client';
import { generateReferralCode } from '../lib/generateRefferalCode';
import { subDays, startOfWeek, endOfWeek } from 'date-fns';
import { Prisma } from '@prisma/client';
export const registerUser = expressAsyncHandler(async (req, res) => {
  const {
    fullName,
    walletAddress,
    email,
    firstName,
    lastName,
    username,
    publicKey,
    walletSource,
    authMethod,
    profilePicture,
  } = req.body;

  if (!walletAddress) {
    res.status(400).json({ message: 'Missing auth provider ID.' });
    return;
  }

  // CHECK IF WALLET IS AVAILABLE

  const existingUser = await prisma.user.findUnique({
    where: { walletAddress }, // assuming `email` is unique in DB schema
  });

  console.log('already create an account', existingUser);
  if (existingUser) {
    res.status(200).json({
      message: 'User already exists. Linking current session.',
      userId: existingUser.id,
    });
    return;
  }
  // Create the user
  const newUser = await prisma.user.create({
    data: {
      walletAddress,
      fullName,
      firstName,
      lastName,
      email,
      username,
      authMethod,
      profilePicture,
      // All other fields left empty for now (onboarding)
      wallets: {
        create: {
          walletSource,
          publicKey,
          name: walletSource,
        },
      },
    },
  });

  console.log('Registered user ', newUser);
  // Register wallet

  res.status(201).json({
    message: 'User registered successfully.',
    userId: newUser.id,
  });
});

// Get users
export const getUsersWithStats = expressAsyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = (req.query.search as string) || '';

  const skip = (page - 1) * limit;

  // Filtering logic
  const where = search
    ? {
        OR: [
          {
            username: { contains: search, mode: Prisma.QueryMode.insensitive },
          },
          {
            fullName: { contains: search, mode: Prisma.QueryMode.insensitive },
          },
        ],
      }
    : {};

  // 1. Paginated users
  const users = await prisma.user.findMany({
    where,
    skip,
    take: limit,
    select: {
      id: true,
      fullName: true,
      firstName: true,
      lastName: true,
      points: true,
      phone: true,
      profilePicture: true,
      createdAt: true,
      earlyAccess: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // 2. Total count
  const totalUsers = await prisma.user.count();

  // 3. Weekly growth comparison
  const now = new Date();
  const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
  const startOfLastWeek = subDays(startOfThisWeek, 7);
  const endOfLastWeek = subDays(startOfThisWeek, 1);

  const thisWeekCount = await prisma.user.count({
    where: {
      createdAt: {
        gte: startOfThisWeek,
      },
    },
  });

  const lastWeekCount = await prisma.user.count({
    where: {
      createdAt: {
        gte: startOfLastWeek,
        lte: endOfLastWeek,
      },
    },
  });

  const growthPercent =
    lastWeekCount === 0
      ? 100
      : ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100;

  // 4. Users today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = await prisma.user.count({
    where: {
      createdAt: {
        gte: today,
      },
    },
  });

  res.status(200).json({
    users,
    pagination: {
      total: totalUsers,
      page,
      limit,
    },
    stats: {
      totalUsers,
      newUsersThisWeek: thisWeekCount,
      newUsersLastWeek: lastWeekCount,
      growthPercent: Math.round(growthPercent * 100) / 100, // round to 2 decimal places
      usersToday: todayCount,
    },
  });
});

export const getUser = expressAsyncHandler(async (req, res) => {
  const { userId, walletAddress } = req.query;

  if (!userId && !walletAddress) {
    res.status(400).json({
      message: 'Provide at least one filter: userId, privyId, or email.',
    });
    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      ...(userId && { id: String(userId) }),
      ...(walletAddress && { walletAddress: String(walletAddress) }),
    },
    include: {
      wallets: {
        select: {
          walletSource: true,
          name: true,
          publicKey: true,
          active: true,
        },
      },
    },
  });

  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }

  res.status(200).json({
    user,
  });
});

export const getUserTransactions = expressAsyncHandler(async (req, res) => {
  const { userId, walletAddress, page = 1, limit = 10, type } = req.query;

  if (!userId && !walletAddress) {
    res.status(400).json({ message: 'Missing userId or privyId' });
    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      ...(userId ? { id: userId as string } : {}),
      ...(walletAddress ? { walletAddress: walletAddress as string } : {}),
    },
    select: { id: true },
  });

  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const where = {
    userId: user.id,
    ...(type ? { type: type as any } : {}),
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
      select: {
        id: true,
        type: true,
        amount: true,
        token: true,
        description: true,
        transactionId: true,
        createdAt: true,
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  res.status(200).json({
    transactions,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
    },
  });
});

// add  wallet
export const addWalletToUser = expressAsyncHandler(async (req, res) => {
  const { userId, publicKey, walletSource, name, chain } = req.body;

  if (!userId || !publicKey || !walletSource) {
    res.status(400).json({ message: 'Missing required wallet data' });
    return;
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  // Prevent duplicate wallet for same user
  const existingWallet = await prisma.wallet.findFirst({
    where: {
      ownerId: userId,
      publicKey: publicKey.toLowerCase(),
    },
  });

  if (existingWallet) {
    res.status(409).json({ message: 'Wallet already exists for this user' });
    return;
  }

  // Create wallet
  const wallet = await prisma.wallet.create({
    data: {
      ownerId: userId,
      name: name || walletSource,
      publicKey: publicKey.toLowerCase(),
      walletSource,
      chain: chain || 'CHILIZ',
    },
  });

  res.status(201).json({ message: 'Wallet added', wallet });
});

//   check early access

export const earlyAccessChecker = expressAsyncHandler(async (req, res) => {
  const { userId, walletAddress } = req.query;

  if (!userId && !walletAddress) {
    res.status(400).json({ error: 'Missing userId or privyId' });
  }

  const user = await prisma.user.findFirst({
    where: {
      ...(userId ? { id: String(userId) } : {}),
      ...(walletAddress ? { walletAddress: String(walletAddress) } : {}),
    },
    select: {
      earlyAccess: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
  }

  res.json({ earlyAccess: !!user.earlyAccess });
});

export const generateCodesController = async (req, res) => {
  const count = parseInt(req.query.count as string) || 1;

  const codes = await Promise.all(
    Array.from({ length: count }).map(() =>
      prisma.earlyAccessCode.create({
        data: {
          code: generateReferralCode(6),
        },
      }),
    ),
  );

  return res.status(200).json({ codes });
};

export const submitCodeController = async (req, res) => {
  const { code, walletAddress } = req.body;

  if (!code || !walletAddress) {
    return res.status(400).json({ error: 'Code and user ID are required.' });
  }

  const existingCode = await prisma.earlyAccessCode.findUnique({
    where: { code },
  });

  if (!existingCode) {
    return res.status(404).json({ error: 'Code not found or invalid.' });
  }

  if (existingCode.used) {
    return res.status(409).json({ error: 'Code already used.' });
  }

  await prisma.earlyAccessCode.update({
    where: { code },
    data: {
      used: true,
      usedAt: new Date(),
      usedBy: walletAddress,
    },
  });

  await prisma.user.updateMany({
    where: { walletAddress },
    data: {
      earlyAccess: true,
    },
  });

  return res.status(200).json({ success: true });
};
// link telegram

export const linkTelegram = expressAsyncHandler(async (req, res) => {
  const { walletAddress, telegramChatId } = req.body;

  if (!walletAddress || !telegramChatId) {
    res
      .status(400)
      .json({ message: 'Missing walletAddress or telegramChatId.' });
  }

  const user = await prisma.user.findUnique({
    where: { walletAddress },
  });

  if (!user) {
    res.status(404).json({ message: 'User not found.' });
  }

  const updatedUser = await prisma.user.update({
    where: { walletAddress },
    data: { telegramChatId },
  });

  res.status(200).json({
    message: 'Telegram account linked successfully.',
    userId: updatedUser.id,
  });
});

export const notifyVaultParticipants = expressAsyncHandler(async (req, res) => {
  const { vaultId, title, body, type, link } = req.body;

  if (!vaultId || !type || !title) {
    res.status(400).json({ message: 'vaultId, title, and type are required.' });
  }

  const interactions = await prisma.vaultInteraction.findMany({
    where: { vaultId },
    select: { userId: true },
    distinct: ['userId'], // Prevent duplicate notifications
  });

  const notifications = interactions.map((i) => ({
    userId: i.userId,
    title,
    body,
    type,
    link,
  }));

  await prisma.notification.createMany({ data: notifications });

  res.status(201).json({
    message: `Notification sent to ${notifications.length} depositors.`,
  });
});

// Notify followers

export const notifyVaultFollowers = expressAsyncHandler(async (req, res) => {
  const { vaultId, title, body, type, link } = req.body;

  if (!vaultId || !type || !title) {
    res.status(400).json({ message: 'vaultId, title, and type are required.' });
    return;
  }

  const followers = await prisma.follow.findMany({
    where: { vaultId },
    include: { user: true },
  });

  const notifications = followers.map((follower) => ({
    userId: follower.userId,
    title,
    body,
    type,
    link,
  }));

  await prisma.notification.createMany({ data: notifications });

  res.status(201).json({
    message: `Notification sent to ${notifications.length} followers.`,
  });
});
