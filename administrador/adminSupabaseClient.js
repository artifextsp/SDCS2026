// /administrador/adminSupabaseClient.js
// Cliente Supabase exclusivo del área Administrador (no interfiere con /js/supabaseClient.js).
// Requiere que el HTML cargue primero el CDN v2:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

const SUPABASE_URL = 'https://trfiejowmfgzudhsdpdx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZmllam93bWZnenVkaHNkcGR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MjM2MjksImV4cCI6MjA3MTk5OTYyOX0.SCNuSO9uKtaKfGBSi3WMIpvNFmsE66aRROJEgTUrx34';

// Creamos un cliente independiente y lo exportamos con nombre.
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// (Opcional) exposición de solo-lectura para depuración
window.__supabaseAdmin__ = supabase;
