import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.examQuestion.groupBy({
    by: ["category"],
    _count: {
      _all: true,
    },
  });

  const counts = Object.fromEntries(
    rows.map((r) => [r.category, r._count._all])
  );

  return NextResponse.json({
    data: counts,
  });
}