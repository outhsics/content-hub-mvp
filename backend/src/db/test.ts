import dotenv from 'dotenv';
import { db } from './connection';

dotenv.config();

async function testDatabase() {
  console.log('🧪 Testing database connection...\n');

  try {
    // Test 1: Connection
    console.log('Test 1: Testing connection...');
    const result = await db.query('SELECT NOW() as current_time');
    console.log('✅ Connection successful! Server time:', result.rows[0].current_time);
    console.log('');

    // Test 2: Tables exist
    console.log('Test 2: Checking tables...');
    const tables = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `);
    console.log('✅ Tables found:', tables.rows.map(r => r.table_name));
    console.log('');

    // Test 3: Sources data
    console.log('Test 3: Checking sources data...');
    const sources = await db.query('SELECT COUNT(*) as count FROM sources');
    console.log(`✅ Found ${sources.rows[0].count} sources`);

    const activeSources = await db.query("SELECT name, source_type FROM sources WHERE is_active = true LIMIT 5");
    console.log('Active sources (first 5):');
    activeSources.rows.forEach(s => console.log(`  - ${s.name} (${s.source_type})`));
    console.log('');

    // Test 4: Templates data
    console.log('Test 4: Checking templates data...');
    const templates = await db.query('SELECT COUNT(*) as count FROM rewrite_templates');
    console.log(`✅ Found ${templates.rows[0].count} templates`);

    const templateList = await db.query('SELECT name, style FROM rewrite_templates');
    console.log('Available templates:');
    templateList.rows.forEach(t => console.log(`  - ${t.name} (${t.style})`));
    console.log('');

    console.log('✅ All database tests passed!');
    console.log('\n📊 Database is ready for use!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  }
}

testDatabase();
