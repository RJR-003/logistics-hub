import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["query"], // prints every SQL query to terminal
});

export default prisma;
