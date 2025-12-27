import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = await fetch(`${supabaseUrl}/functions/v1/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log("upload function status:", res.status);
  console.log("upload function response:", text);

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return NextResponse.json(data, { status: res.status });
}
