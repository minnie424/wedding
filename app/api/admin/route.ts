import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { uploading_open,voting_open } = await req.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_SUPABASE_URL" },
        { status: 500 }
      );
    }

    if (!serviceKey) {
      return NextResponse.json(
        { error: "Missing SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const res = await fetch(
      `${supabaseUrl}/rest/v1/app_settings?id=eq.1`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          uploading_open: !!uploading_open,
          voting_open: !!voting_open,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to update uploading/voting status" },
      { status: 500 }
    );
  }
}
