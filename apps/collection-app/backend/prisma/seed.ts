import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const regions = [
    { code: "SOUTH-01", name: "Chennai Region" },
    { code: "SOUTH-02", name: "Bangalore Region" },
    { code: "NORTH-01", name: "Delhi Region" },
    { code: "NORTH-02", name: "Mumbai Region" },
    { code: "EAST-01", name: "Kolkata Region" },
    { code: "WEST-01", name: "Ahmedabad Region" },
  ];

  for (const region of regions) {
    await prisma.region.upsert({
      where: { code: region.code },
      update: {},
      create: region,
    });
  }

  console.log("Seeded regions successfully");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
