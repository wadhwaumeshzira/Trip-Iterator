import { useState, useRef, useEffect } from "react";
import { chatWithGuide } from "../lib/api";
import "./AIGuide.css";

export default function AIGuide({ itinerary }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm your AI Guide. Need help with your trip?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = messages.filter(
        (m) => !(m.role === "assistant" && m.content.startsWith("Hi! I'm your AI Guide"))
      );
      const reply = await chatWithGuide(userMsg.content, itinerary, history);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I had trouble connecting." }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="ai-guide-container">
      {isOpen && (
        <div className="ai-guide-window">
          <div className="ai-guide-header">
            <h3>AI Guide ✦</h3>
            <button onClick={() => setIsOpen(false)} aria-label="Close chat">
              ×
            </button>
          </div>
          <div className="ai-guide-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`ai-message ai-message--${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {isLoading && <div className="ai-message ai-message--assistant">Thinking...</div>}
            <div ref={messagesEndRef} />
          </div>
          <form className="ai-guide-input-area" onSubmit={handleSubmit}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your trip..."
            />
            <button type="submit" disabled={isLoading || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
      <button
        className={`ai-guide-toggle ${!isOpen ? "highlight-pulse" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Guide"
      >
        ✦ AI Guide
      </button>
    </div>
  );
}
