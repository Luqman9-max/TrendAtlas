/**
 * Seed Script
 *
 * Runs the data pipeline once to populate the database with real data.
 * Use this after setting up Supabase and configuring .env.
 *
 * Usage: node backend/src/scripts/seed.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { runPipeline } = require('../services/pipeline');

async function seed() {
  console.log('='.repeat(50));
  console.log('TrendAtlas — Seed Script');
  console.log('='.repeat(50));

  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    console.error('\n❌ SUPABASE_URL not configured. Set it in backend/.env first.');
    console.log('\nSteps:');
    console.log('  1. Create a project at https://supabase.com');
    console.log('  2. Run the SQL migration in Supabase SQL Editor');
    console.log('     (backend/src/db/migrations/001_initial_schema.sql)');
    console.log('  3. Copy credentials to backend/.env');
    console.log('  4. Run this script again\n');
    process.exit(1);
  }

  console.log('\nRunning data pipeline...\n');

  try {
    const summary = await runPipeline();

    console.log('\n✅ Seed complete!\n');
    console.log('Results:');
    console.log(`  GitHub:  ${summary.github.fetched} fetched, ${summary.github.stored} stored${summary.github.error ? ` (error: ${summary.github.error})` : ''}`);
    console.log(`  Reddit:  ${summary.reddit.fetched} fetched, ${summary.reddit.stored} stored${summary.reddit.error ? ` (error: ${summary.reddit.error})` : ''}`);
    console.log(`  Google:  ${summary.google.fetched} fetched, ${summary.google.stored} stored${summary.google.error ? ` (error: ${summary.google.error})` : ''}`);
    console.log(`  Scored:  ${summary.scored || 0} trends`);
    console.log(`  Time:    ${summary.duration}ms\n`);
  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    process.exit(1);
  }

  process.exit(0);
}

seed();
