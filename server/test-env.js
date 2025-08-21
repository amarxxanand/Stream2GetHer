import dotenv from 'dotenv';

dotenv.config();

console.log('=== Environment Test ===');
console.log('PORT:', process.env.PORT);
console.log('GOOGLE_SERVICE_ACCOUNT_KEY exists:', !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
console.log('GOOGLE_SERVICE_ACCOUNT_KEY length:', process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.length);

if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
  try {
    const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    console.log('JSON parsed successfully');
    console.log('Project ID:', parsed.project_id);
    console.log('Client Email:', parsed.client_email);
  } catch (error) {
    console.error('JSON parsing error:', error.message);
  }
} else {
  console.log('GOOGLE_SERVICE_ACCOUNT_KEY is undefined');
}
