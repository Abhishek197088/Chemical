const { Client } = require('pg');

const passwords = ['', 'admin', 'root', '123456', '1234', 'password', 'postgres123'];
const username = 'postgres';
const host = 'localhost';
const database = 'postgres';
const port = 5432;

async function testConnection(password) {
  const client = new Client({
    user: username,
    host,
    database,
    password,
    port,
    ssl: false // Disable SSL for local check
  });

  try {
    await client.connect();
    await client.end();
    return true;
  } catch (err) {
    return false;
  }
}

async function run() {
  console.log("Testing local PostgreSQL passwords...");
  for (const pw of passwords) {
    const displayPw = pw === '' ? '(empty)' : pw;
    const success = await testConnection(pw);
    if (success) {
      console.log(`\n🎉 SUCCESS! Connected with password: "${pw}"`);
      console.log(`DATABASE_URL="postgresql://${username}:${pw}@${host}:${port}/${database}?sslmode=disable"`);
      process.exit(0);
    } else {
      console.log(`❌ Failed with password: "${displayPw}"`);
    }
  }
  console.log("\nNo default passwords succeeded. Please input your local PostgreSQL password.");
  process.exit(1);
}

run();
