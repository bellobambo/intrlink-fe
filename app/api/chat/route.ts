import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const apiKey = process.env.VENICE_API_KEY || process.env.VENICE_AI;

    const response = await fetch("https://api.venice.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4-5",
        messages,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Venice AI API Error:", errorText);
      return NextResponse.json({ error: "Failed to fetch response from Venice AI" }, { status: response.status });
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Venice AI Chat Error:", error);
    return NextResponse.json({ error: "Failed to fetch response from Venice AI" }, { status: 500 });
  }
}
