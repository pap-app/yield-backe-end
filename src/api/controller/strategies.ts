import expressAsyncHandler from 'express-async-handler';
import prisma from '../prisma-client';

export const registerStrategy = expressAsyncHandler(async (req, res) => {
  const { name, network } = req.body;

  if (!name) {
    res.status(400).json({
      message: 'name, and network are required.',
    });
    return;
  }

  const existingStrategy = await prisma.strategy.findFirst({
    where: { name },
  });

  if (existingStrategy) {
    res.status(200).json({
      message: 'Strategy already exists.',
      strategy: existingStrategy,
    });
    return;
  }

  const vault = await prisma.strategy.create({
    data: {
      name,
      type: 'fixed',
    },
  });

  res.status(201).json({
    message: 'Strategy created',
    vault,
  });
});
