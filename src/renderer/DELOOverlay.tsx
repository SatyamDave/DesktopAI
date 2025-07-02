import { useState, useEffect, useRef } from "react";
import { Mic, SendHorizontal, X } from "lucide-react";
import { motion } from "framer-motion";

const suggestions = [
  "Summarize this",
  "Translate to French",
  "Create task",
  "Send as email",
  "Search this",
];

export default function DELOOverlay() {
  const [input, setInput] = useState("");
  const [visible, setVisible] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const dragOffset = useRef({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);
  const lastPosition = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const toggleOverlay = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "Space") setVisible((v) => !v);
    };
    window.addEventListener("keydown", toggleOverlay);
    return () => window.removeEventListener("keydown", toggleOverlay);
  }, []);

  // Optimized drag handlers
  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    const rect = overlayRef.current?.getBoundingClientRect();
    // Use the current mouse position minus the overlay's current position
    dragOffset.current = {
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
    };
    lastPosition.current = {
      x: (rect?.left ?? 0) - window.innerWidth / 2 + (rect?.width ?? 0) / 2,
      y: (rect?.top ?? 0) - 24,
    };
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    if (!dragging) return;
    let animating = false;
    let nextPos = { ...lastPosition.current };
    const onMouseMove = (e: MouseEvent) => {
      nextPos = {
        x: e.clientX - dragOffset.current.x - window.innerWidth / 2 + (overlayRef.current?.offsetWidth ?? 0) / 2,
        y: e.clientY - dragOffset.current.y - 24,
      };
      if (!animating) {
        animating = true;
        rafRef.current = requestAnimationFrame(() => {
          if (overlayRef.current) {
            overlayRef.current.style.left = `calc(50% + ${nextPos.x}px)`;
            overlayRef.current.style.top = `${nextPos.y + 24}px`;
            overlayRef.current.style.transform = "translateX(-50%)";
          }
          animating = false;
        });
      }
    };
    const onMouseUp = () => {
      setDragging(false);
      setPosition(nextPos); // Only update React state at the end
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line
  }, [dragging]);

  // Ensure overlay is positioned correctly after drag or on mount
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.style.left = `calc(50% + ${position.x}px)`;
      overlayRef.current.style.top = `${position.y + 24}px`;
      overlayRef.current.style.transform = "translateX(-50%)";
    }
  }, [position, visible]);

  // Handle sending input to backend/AI
  const handleSend = async () => {
    if (!input.trim()) return;
    setMessages((msgs) => [...msgs, { role: 'user', text: input }]);
    setInput("");
    try {
      let aiResult = { success: false, message: "No backend connected." };
      if (window.friday && window.friday.processCommand) {
        aiResult = await window.friday.processCommand(input);
      }
      setMessages((msgs) => [
        ...msgs,
        { role: 'ai', text: aiResult.success ? aiResult.message : (aiResult.message || 'Error') },
      ]);
    } catch (err) {
      setMessages((msgs) => [
        ...msgs,
        { role: 'ai', text: 'Error: ' + (err instanceof Error ? err.message : String(err)) },
      ]);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!visible) return null;

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="fixed z-50 w-full max-w-xl p-4"
      ref={overlayRef}
      style={{ left: `calc(50% + ${position.x}px)`, top: `${position.y + 24}px`, transform: "translateX(-50%)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl text-white cursor-move select-none"
        onMouseDown={onMouseDown}
      >
        <div className="flex items-center px-4 py-3 space-x-3 cursor-move select-none">
          <Mic className="w-5 h-5 opacity-70" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask DELO anything..."
            className="bg-transparent outline-none w-full placeholder-white/50 text-white cursor-auto select-text"
            onMouseDown={e => e.stopPropagation()}
            onKeyDown={handleInputKeyDown}
          />
          <SendHorizontal
            className="w-5 h-5 cursor-pointer opacity-70 hover:opacity-100"
            onClick={handleSend}
          />
        </div>

        {/* Chat messages */}
        <div className="flex flex-col gap-2 px-4 pb-4 max-h-60 overflow-y-auto cursor-auto select-auto">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-500/20 self-end text-blue-100'
                  : 'bg-white/10 self-start text-white/90'
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>

        {/* Suggestions */}
        <div className="flex flex-wrap gap-2 px-4 pb-4 cursor-auto select-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => setInput(s)}
              className="bg-white/10 hover:bg-white/20 text-sm px-3 py-1 rounded-full transition"
            >
              {s}
            </button>
          ))}
        </div>

        {(hovering || dragging) && (
          <X
            onClick={() => setVisible(false)}
            className="absolute top-3 right-3 w-4 h-4 cursor-pointer opacity-50 hover:opacity-100"
          />
        )}
      </motion.div>
    </div>
  );
} 