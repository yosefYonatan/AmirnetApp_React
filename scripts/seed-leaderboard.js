// ==========================================
// scripts/seed-leaderboard.js
//
// Populates the Supabase leaderboard with 10 dummy BGU students.
// Run once from the project root:
//
//   node scripts/seed-leaderboard.js
//
// Requires: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
// in .env.local (or set directly below for a one-off run).
// ==========================================

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl     = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌  Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Dummy students ────────────────────────────────────────────────────
const STUDENTS = [
  { full_name: 'Tal Cohen',       department: 'cs',          xp_points: 1340 },
  { full_name: 'Noa Levi',        department: 'engineering', xp_points: 1210 },
  { full_name: 'Amir Ben-David',  department: 'cs',          xp_points: 1080 },
  { full_name: 'Shira Mizrahi',   department: 'cs',          xp_points:  960 },
  { full_name: 'Yonatan Katz',    department: 'engineering', xp_points:  850 },
  { full_name: 'Maya Peretz',     department: 'other',       xp_points:  730 },
  { full_name: 'Itay Shapiro',    department: 'cs',          xp_points:  640 },
  { full_name: 'Lior Friedman',   department: 'engineering', xp_points:  510 },
  { full_name: 'Dana Goldstein',  department: 'other',       xp_points:  380 },
  { full_name: 'Rotem Avraham',   department: 'engineering', xp_points:  200 },
];

async function seed() {
  console.log('🌱  Seeding leaderboard with dummy BGU students…\n');

  for (const student of STUDENTS) {
    // Create a fake auth user (anonymous sign-up trick: use Supabase admin API
    // via service role key for real use; here we insert directly into profiles
    // using a generated UUID — valid for demo if RLS allows it).
    const fakeUUID = crypto.randomUUID();

    const { error } = await supabase
      .from('profiles')
      .insert({
        id:         fakeUUID,
        full_name:  student.full_name,
        email:      `${student.full_name.toLowerCase().replace(/\s+/g, '.')}@bgu.ac.il`,
        department: student.department,
        xp_points:  student.xp_points,
      });

    if (error) {
      console.error(`❌  ${student.full_name}: ${error.message}`);
    } else {
      console.log(`✅  ${student.full_name.padEnd(22)} ${student.department.padEnd(12)} ${student.xp_points} XP`);
    }
  }

  console.log('\n🎉  Done! Check your Supabase dashboard → Table Editor → profiles');
}

seed();
