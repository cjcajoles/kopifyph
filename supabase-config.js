// Shared Supabase connection, included by every page that talks to the database.
// SUPABASE_ANON_KEY is the "publishable" key — safe to expose in browser code.
// Every table it can reach is protected by Row Level Security (see supabase/schema.sql),
// so this key alone can't read or write anything it isn't explicitly allowed to.
const SUPABASE_URL = 'https://atolfcpfleujeqzxgrxz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_mzAmx4bXFuOjbiOsOu1XCA_0oBx8t6r';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
