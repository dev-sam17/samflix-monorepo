import { PrismaClient, } from './generated/prisma/client';

const prisma = new PrismaClient();


export { prisma, PrismaClient };
export * from './generated/prisma/client';
