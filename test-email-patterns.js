// Test script for email name detection patterns
const testPrompt = "Compose an email to John about the meeting";

console.log('Testing prompt:', testPrompt);

// Simple and reliable name detection patterns
const namePatterns = [
  // "to John" - most common pattern
  /to\s+([A-Za-z]+)/i,
  // "email to John" 
  /email\s+to\s+([A-Za-z]+)/i,
  // "compose email to John"
  /compose\s+email\s+to\s+([A-Za-z]+)/i,
  // "write email to John"
  /write\s+email\s+to\s+([A-Za-z]+)/i,
  // "send email to John"
  /send\s+email\s+to\s+([A-Za-z]+)/i
];

let foundName = undefined;

// Test each pattern and log results for debugging
for (let i = 0; i < namePatterns.length; i++) {
  const pattern = namePatterns[i];
  const execResult = pattern.exec(testPrompt);
  
  console.log(`Pattern ${i + 1} (${pattern.source}):`, execResult);
  if (execResult) {
    console.log(`  execResult[0]:`, execResult[0]);
    console.log(`  execResult[1]:`, execResult[1]);
    const candidate = execResult[1];
    
    // Filter out common words that aren't names
    const commonWords = ['the', 'a', 'an', 'about', 'regarding', 'concerning', 'for', 'meeting', 'discussion', 'project', 'work', 'email'];
    if (!commonWords.includes(candidate.toLowerCase())) {
      foundName = candidate;
      console.log(`Found valid name: "${foundName}"`);
      break;
    } else {
      console.log(`Filtered out common word: "${candidate}"`);
    }
  }
}

console.log('Final found name:', foundName);
console.log('Should be name-only:', foundName ? true : false); 