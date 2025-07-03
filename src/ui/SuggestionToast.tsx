import React from 'react';

export default function SuggestionToast({ suggestion, visible }: { suggestion: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-16 right-4 bg-violet-600 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in-out z-50">
      {suggestion}
    </div>
  );
} 