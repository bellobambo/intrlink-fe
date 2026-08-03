import OpenAI from "openai";

const apiKey = process.env.VENICE_API_KEY || process.env.VENICE_AI;

if (!apiKey) {
  console.error("No Venice API key found in .env");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey,
  baseURL: "https://api.venice.ai/api/v1",
});

async function main() {
  try {
    console.log("Sending chat completion request to Venice AI...");
    const completion = await openai.chat.completions.create({
      model: "zai-org-glm-5-2",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello! What is your name and what model are you?" }
      ],
    });

    console.log("Response:");
    console.log(completion.choices[0].message.content);
  } catch (error) {
    console.error("Error calling Venice AI:", error);
  }
}

main();
