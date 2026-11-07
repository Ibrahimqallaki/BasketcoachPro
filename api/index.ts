// Serverless entrypoint for the existing Express API.
// Vercel handles HTTP lifecycle; server.ts only listens when run locally.
import app from '../server';

export default app;
