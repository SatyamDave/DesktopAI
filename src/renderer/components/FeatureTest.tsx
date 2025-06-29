import React, { useState } from 'react';
import { AutomationTestSuite } from '../../main/services/AutomationTestSuite';

const FeatureTest: React.FC = () => {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const suite = new AutomationTestSuite();
    const res = await suite.runAllTests();
    setResults(res);
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Doppel Automation Test Suite</h2>
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mb-4"
        onClick={runTests}
        disabled={loading}
      >
        {loading ? 'Running...' : 'Run Tests'}
      </button>
      {results && (
        <div>
          <div className="mb-4">
            <strong>Overall:</strong> {results.passedTests} / {results.totalTests} passed
            <br />Success Rate: {results.successRate.toFixed(1)}%
            <br />Total Duration: {results.totalDuration}ms
          </div>
          <ul>
            {results.tests.map((test: any) => (
              <li key={test.name} className={`mb-2 p-2 rounded ${test.success ? 'bg-green-100' : 'bg-red-100'}`}> 
                <strong>{test.name}</strong> - {test.success ? '✅' : '❌'} ({test.duration}ms)
                {test.error && <div className="text-red-600">Error: {test.error}</div>}
                {test.suggestions && test.suggestions.length > 0 && (
                  <ul className="ml-4 text-sm text-blue-700">
                    {test.suggestions.map((s: string, i: number) => <li key={i}>💡 {s}</li>)}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export { FeatureTest }; 