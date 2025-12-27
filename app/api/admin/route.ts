import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function mustEnv() {
  if (!supabaseUrl) {
    return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });
  }
  if (!serviceKey) {
    return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  }
  return null;
}

export async function GET() {
  const envErr = mustEnv();
  if (envErr) return envErr;

  const res = await fetch(`${supabaseUrl}/rest/v1/app_settings?select=uploading_open,voting_open,updated_at&id=eq.1`, {
    method: "GET",
    headers: {
      apikey: serviceKey!,
      Authorization: `Bearer ${serviceKey!}`,
    },
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  // rest returns an array by default
  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ ok: res.ok, settings: row }, { status: res.status });
}

export async function POST(req: Request) {
  const envErr = mustEnv();
  if (envErr) return envErr;

  try {
    const body = await req.json();

    // only patch fields provided
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (typeof body.uploading_open === "boolean") patch.uploading_open = body.uploading_open;
    if (typeof body.voting_open === "boolean") patch.voting_open = body.voting_open;

    if (!("uploading_open" in patch) && !("voting_open" in patch)) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const res = await fetch(`${supabaseUrl}/rest/v1/app_settings?id=eq.1`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey!,
        Authorization: `Bearer ${serviceKey!}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(patch),
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return NextResponse.json({ ok: res.ok, settings: Array.isArray(data) ? data[0] : data }, { status: res.status });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to update settings" },
      { status: 500 }
    );
  }
}
