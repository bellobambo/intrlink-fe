"use client";

import { useState, useRef, useEffect } from "react";
import { MessageOutlined, CloseOutlined, RobotOutlined, SendOutlined } from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CopilotProps {
  merchantName: string;
  paymentHistory: any[];
  balance: string | null;
  assetPrices: Record<string, number>;
  isCheckoutDrawerOpen: boolean;
}

export default function Copilot({ merchantName, paymentHistory, balance, assetPrices, isCheckoutDrawerOpen }: CopilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const systemPrompt = `You are the Intrlink Copilot, an AI assistant for a merchant named "${merchantName}".
Your goal is to provide helpful analysis and support based on the merchant's data.
Current Wallet C2FLR Balance: ${balance || "Unknown"}
Live Crypto Prices (USD):
${Object.entries(assetPrices).map(([sym, price]) => `- ${sym}: $${price}`).join("\n")}
Recent Payment History (JSON format):
${JSON.stringify(paymentHistory.slice(0, 50))}

Provide concise, helpful answers. Use markdown for formatting. If the user asks for a sales summary, calculate totals from the payment history.`;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        { role: "assistant", content: `Hello! I'm your Intrlink Copilot. I can analyse your sales, explain payments, or help you with your terminal. How can I assist you today?` }
      ]);
    }
  }, [isOpen, messages.length]);

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user" as const, content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            userMessage
          ]
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <motion.button 
        className="copilot-toggle"
        onClick={() => setIsOpen(true)}
        initial={false}
        animate={{ x: isCheckoutDrawerOpen ? "calc(-100vw + 56px + 48px)" : "0px" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "28px",
          backgroundColor: "var(--forest)",
          color: "white",
          border: "none",
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          display: isOpen ? "none" : "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "24px",
          cursor: "pointer",
          zIndex: 9999,
        }}
      >
        <RobotOutlined />
      </motion.button>

      {isOpen && (
        <motion.div 
          initial={false}
          animate={{ x: isCheckoutDrawerOpen ? "calc(-100vw + 380px + 48px)" : "0px" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "380px",
          height: "600px",
          maxHeight: "80vh",
          backgroundColor: "white",
          border: "1px solid var(--line)",
          borderRadius: "16px",
          boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          zIndex: 9999,
          overflow: "hidden"
        }}>
          <div style={{
            padding: "16px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "linear-gradient(90deg, rgba(39,244,209,0.1) 0%, rgba(0,0,0,0) 100%)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ background: "var(--forest)", color: "white", width: "32px", height: "32px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <RobotOutlined />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "16px" }}>Intrlink Copilot</div>
                <div style={{ fontSize: "12px", opacity: 0.6 }}>AI Assistant</div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: "transparent", border: "none", color: "var(--ink)", cursor: "pointer", opacity: 0.6, padding: "8px" }}
            >
              <CloseOutlined />
            </button>
          </div>

          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                backgroundColor: msg.role === "user" ? "var(--forest)" : "var(--mint)",
                color: msg.role === "user" ? "white" : "var(--ink)",
                padding: "12px 16px",
                borderRadius: "12px",
                borderBottomRightRadius: msg.role === "user" ? "4px" : "12px",
                borderBottomLeftRadius: msg.role === "assistant" ? "4px" : "12px",
                fontSize: "14px",
                lineHeight: "1.5"
              }}>
                {msg.role === "assistant" ? (
                  <div className="markdown-body">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            ))}
            {isLoading && (
              <div style={{ alignSelf: "flex-start", opacity: 0.6, fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                <RobotOutlined className="spin" /> Copilot is thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} style={{
            padding: "16px",
            borderTop: "1px solid var(--line)",
            display: "flex",
            gap: "8px"
          }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your sales..."
              style={{
                flex: 1,
                background: "var(--mint)",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                padding: "10px 14px",
                color: "var(--ink)",
                outline: "none"
              }}
            />
            <button 
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{
                background: "var(--forest)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                width: "42px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
                opacity: isLoading || !input.trim() ? 0.5 : 1
              }}
            >
              <SendOutlined />
            </button>
          </form>
        </motion.div>
      )}
    </>
  );
}
