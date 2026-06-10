import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["query"], // to log all queries
});

export default prisma;
