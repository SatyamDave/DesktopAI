import React, { useState } from 'react';

interface OnboardingProps {
  onFinish: () => void;
}

const steps = [
  {
    title: 'Welcome to DELO',
    description: 'Your new desktop assistant for quick commands.'
  },
  {
    title: 'Use Commands',
    description: 'Summarize, translate, and open apps instantly.'
  },
  {
    title: 'Ready to go',
    description: 'Press start to launch the assistant panel.'
  }
];

const Onboarding: React.FC<OnboardingProps> = ({ onFinish }) => {
  const [step, setStep] = useState(0);

  const next = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onFinish();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl shadow-xl p-8 max-w-sm w-full text-center text-white">
        <h2 className="text-xl font-semibold mb-2">{steps[step].title}</h2>
        <p className="mb-6 text-sm">{steps[step].description}</p>
        <button
          onClick={next}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition"
        >
          {step < steps.length - 1 ? 'Next' : 'Start'}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
