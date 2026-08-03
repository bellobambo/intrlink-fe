import { NextResponse } from "next/server";
import OpenAI from "openai";

const apiKey = process.env.VENICE_API_KEY || process.env.VENICE_AI;

const openai = new OpenAI({
  apiKey,
  baseURL: "https://api.venice.ai/api/v1",
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const completion = await openai.chat.completions.create({
      model: "zai-org-glm-5-2",
      messages,
      // Optional: Add tools here later based on the PRD (getSalesSummary, draftCart, etc)
    });

    return NextResponse.json(completion.choices[0].message);
  } catch (error) {
    console.error("Venice AI Chat Error:", error);
    return NextResponse.json({ error: "Failed to fetch response from Venice AI" }, { status: 500 });
  }
}
