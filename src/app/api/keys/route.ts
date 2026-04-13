import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { getNextMidnightPT } from "@/lib/quota-tracker";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const keys = await prisma.apiKey.findMany({
      orderBy: { priority: 'desc' },
    });

    const parsedKeys = keys.map((k: any) => {
      let decrypted = '';
      try {
        decrypted = decrypt(k.encryptedKey);
      } catch (err) {
        // Ignored, handled by the masking logic
      }
      
      const masked = decrypted.length > 4 ? `••••••••${decrypted.slice(-4)}` : 'Corrupted Key (Delete & Re-add)';
      return {
        id: k.id,
        label: k.label,
        maskedKey: masked,
        priority: k.priority,
        isActive: k.isActive,
        quotaUsed: k.quotaUsed,
        quotaResetAt: k.quotaResetAt,
        createdAt: k.createdAt,
      };
    });

    return NextResponse.json(parsedKeys);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { label, key } = await req.json();

    if (!key) return NextResponse.json({ error: 'API key is required' }, { status: 400 });

    // Validate the key by making a minimal request
    const testRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&id=UCBR8-60-B28hp2BmDPdntcQ&key=${key}`);
    const testData = await testRes.json();

    if (!testRes.ok) {
      return NextResponse.json({ error: testData.error?.message || 'Invalid API Key' }, { status: 400 });
    }

    const encryptedKey = encrypt(key.trim());

    // Create the key
    const newKey = await prisma.apiKey.create({
      data: {
        label: label || 'New Key',
        encryptedKey,
        quotaResetAt: getNextMidnightPT(),
        quotaUsed: 1 // Cost of the test we just did
      }
    });

    // Also log the quota usage for transparency
    await prisma.quotaLog.create({
      data: {
        apiKeyId: newKey.id,
        endpoint: '/channels (validation)',
        unitCost: 1,
      }
    });

    return NextResponse.json({ success: true, id: newKey.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
