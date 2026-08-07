const fs = require('fs');
const path = require('path');

function loadDotEnv(dotenvPath) {
  if (!fs.existsSync(dotenvPath)) return;
  const src = fs.readFileSync(dotenvPath, 'utf8');
  for (const line of src.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    // Remove surrounding quotes
    process.env[key] = val.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  }
}

(async () => {
  try {
    const repoRoot = path.resolve(__dirname, '..');
    const dotenvPath = path.join(repoRoot, '.env');
    loadDotEnv(dotenvPath);

    const { createClient } = require('@supabase/supabase-js');
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
      process.exit(2);
    }

    const supabase = createClient(url, serviceKey);

    console.log('Connected to Supabase URL (redacted) =>', url.replace(/(^\w+:\/\/)|([/:].*)/g, ''));

    // Try selecting count from places table
    const { data, error, count } = await supabase
      .from('places')
      .select('id', { count: 'exact', head: false })
      .limit(1);

    if (error) {
      console.error('Query error:', error.message);
      process.exit(3);
    }

    console.log('places table row count (estimated):', count ?? (Array.isArray(data) ? data.length : 'unknown'));
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err && err.message ? err.message : String(err));
    process.exit(4);
  }
})();
