export default function Mic({ live }: { live: boolean }) {
  return live ? <div className="fixed bottom-3 right-4 h-3 w-3 rounded-full bg-red-500 animate-pulse"></div> : null;
} 