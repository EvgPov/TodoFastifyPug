import { Pool } from "pg";
import dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
  rejectUnauthorized: false
  }
})

pool.on('connect', async (client) => {
  await client.query('SET search_path TO public');
})

export default pool

process.on('SIGINT', async () => {
  await pool.end();
  console.log('Pool has ended');
  process.exit(0);
});