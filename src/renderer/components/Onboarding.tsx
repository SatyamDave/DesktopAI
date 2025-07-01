import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingProps {
  onComplete: () => void;
}

const steps = [
  { title: 'Welcome to DELO', description: 'Your floating AI assistant' },
  { title: 'Quick Commands', description: 'Summarize, translate and open apps instantly' },
  { title: 'Ready to Go', description: 'Press start to launch the assistant' }
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [index, setIndex] = useState(0);

  const next = () => {
    if (index < steps.length - 1) {
      setIndex(index + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8 w-80 text-center text-white"
        >
          <h2 className="text-lg font-semibold mb-2">{steps[index].title}</h2>
          <p className="text-sm mb-6">{steps[index].description}</p>
          <button
            onClick={next}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition"
          >
            {index < steps.length - 1 ? 'Next' : 'Start'}
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Onboarding;
