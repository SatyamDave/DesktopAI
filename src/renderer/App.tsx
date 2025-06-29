import React, { useState } from 'react';
import FloatingOrb from './components/FloatingOrb';
import { FeatureTest } from './components/FeatureTest';
import './index.css';

function App() {
  const [showFeatureTest, setShowFeatureTest] = useState(false);

  return (
    <div className="App">
      <FloatingOrb />
      
      {/* Feature Test Button */}
      <div className="fixed top-4 right-4 z-40">
        <button
          onClick={() => setShowFeatureTest(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-lg"
        >
          Test Features
        </button>
      </div>

      {showFeatureTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Feature Test Suite</h2>
              <button
                onClick={() => setShowFeatureTest(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <FeatureTest />
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 