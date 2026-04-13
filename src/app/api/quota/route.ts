import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MAX_QUOTA_PER_KEY } from "@/lib/quota-tracker";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { isActive: true },
    });

    const totalActive = keys.length;
    const limit = totalActive * MAX_QUOTA_PER_KEY;
    const used = keys.reduce((acc, key) => acc + key.quotaUsed, 0);
    const remaining = limit - used;

    return NextResponse.json({
      totalActive,
      limit,
      used,
      remaining: remaining < 0 ? 0 : remaining
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
