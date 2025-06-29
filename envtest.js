require('dotenv').config({ path: './.env' });
console.log('API KEY:', process.env.AZURE_OPENAI_API_KEY);
console.log('ENDPOINT:', process.env.AZURE_OPENAI_ENDPOINT);
console.log('DEPLOYMENT:', process.env.AZURE_OPENAI_DEPLOYMENT_NAME);
console.log('API VERSION:', process.env.AZURE_OPENAI_API_VERSION);
console.log('TEST ENV VAR:', process.env.TEST_ENV_VAR); 