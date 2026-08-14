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
    process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
}

const USER2_EMAIL = 'venture.test.user2@example.com';
const USER2_PASSWORD = process.env.TEST_USER2_PASSWORD || '';

(async () => {
  loadDotEnv(path.resolve(__dirname, '..', '.env'));
  const { createClient } = require('@supabase/supabase-js');

  const URL = process.env.VITE_SUPABASE_URL;
  const ANON = process.env.VITE_SUPABASE_ANON_KEY;
  if (!URL || !ANON) {
    console.error('Missing env vars');
    process.exit(2);
  }

  const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anon = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });

  const created = [];

  async function rest(pathname, method, body, extraHeaders = {}, bearer) {
    const res = await fetch(`${URL}/rest/v1/${pathname}`, {
      method,
      headers: {
        apikey: ANON,
        'Content-Type': 'application/json',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...extraHeaders,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, body: text, json };
  }

  let TOKEN;

  try {
    // 1. Locate user2 (service role can list users).
    const { data: { users }, error: listErr } = await admin.auth.admin.listUsers();
    if (listErr) throw listErr;
    const u2 = users.find((u) => u.email === USER2_EMAIL);
    if (!u2) throw new Error('user2 not found');
    console.log(`user2: id=${u2.id} confirmed=${u2.email_confirmed_at ? 'yes' : 'NO'}`);
    const { error: updErr } = await admin.auth.admin.updateUserById(u2.id, { password: USER2_PASSWORD });
    if (updErr) throw updErr;

    // 2. Sign in as user2 -> fresh JWT.
    const { data: sess, error: signErr } = await anon.auth.signInWithPassword({
      email: USER2_EMAIL,
      password: USER2_PASSWORD,
    });
    if (signErr || !sess?.session) throw signErr || new Error('no session');
    TOKEN = sess.session.access_token;

    const [, payload] = TOKEN.split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    console.log(`jwt.sub=${claims.sub} jwt.role=${claims.role}`);

    // 3. Grab an existing place id via anon (places are public-readable).
    const pr = await rest('places?select=id&limit=1', 'GET');
    const placeId = pr.json?.[0]?.id;
    if (!placeId) throw new Error('could not read a place id: ' + pr.body);
    console.log(`placeId=${placeId}`);

    // 4. Matrix of REST insert tests as user2.
    const adventureBody = {
      owner_id: u2.id,
      title: 'repro direct',
      visibility: 'private',
      allow_collaboration: false,
    };
    const savedBody = { user_id: u2.id, place_id: placeId };

    const tests = [
      ['adventures direct minimal', 'adventures', 'POST', adventureBody, { Prefer: 'return=minimal' }],
      ['adventures direct representation', 'adventures', 'POST', adventureBody, { Prefer: 'return=representation' }],
      ['saved_places direct minimal', 'saved_places', 'POST', savedBody, { Prefer: 'return=minimal' }],
      ['saved_places direct representation', 'saved_places', 'POST', savedBody, { Prefer: 'return=representation' }],
    ];

    for (const [name, table, method, body, headers] of tests) {
      const r = await rest(table, method, body, headers, TOKEN);
      console.log(`\n--- ${name} ---\nstatus=${r.status}\nbody=${r.body.slice(0, 600)}`);
      if (r.status >= 200 && r.status < 300) {
        const arr = Array.isArray(r.json) ? r.json : r.json ? [r.json] : [];
        for (const x of arr) if (x && x.id) created.push({ table, id: x.id, extra: x });
      }
    }

    // 5. RPC diagnostics (create the saved_places one if missing).
    for (const fn of ['debug_insert_adventure', 'debug_insert_saved_place']) {
      const r = await rest(`rpc/${fn}`, 'POST', {}, {}, TOKEN);
      console.log(`\n--- rpc ${fn} ---\nstatus=${r.status}\nbody=${r.body.slice(0, 600)}`);
    }
  } catch (err) {
    console.error('FATAL:', err && err.message ? err.message : err);
  } finally {
    // Cleanup via user2's own RLS (owner can delete own rows).
    const unique = new Map();
    for (const row of created) if (!unique.has(`${row.table}:${row.id}`)) unique.set(`${row.table}:${row.id}`, row);
    for (const row of unique.values()) {
      const r = await rest(`${row.table}?id=eq.${row.id}`, 'DELETE', undefined, {}, TOKEN);
      console.log(`cleanup ${row.table}/${row.id}: ${r.status}`);
    }
    // Also clean rows whose inserts returned no body (return=minimal).
    const leftovers = await rest('adventures?title=like.*repro*&select=id,title', 'GET', undefined, {}, TOKEN);
    if (Array.isArray(leftovers.json)) {
      for (const row of leftovers.json) {
        const r = await rest(`adventures?id=eq.${row.id}`, 'DELETE', undefined, {}, TOKEN);
        console.log(`cleanup leftover ${row.id}: ${r.status}`);
      }
    }
    const after = await rest('adventures?title=like.*repro*&select=id,title', 'GET', undefined, {}, TOKEN);
    console.log('leftover adventures:', after.body.slice(0, 300));
  }
})();
