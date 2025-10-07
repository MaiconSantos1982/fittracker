// Supabase Configuration
const SUPABASE_URL = 'https://cwucfwsxdncqoziaaenm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3dWNmd3N4ZG5jcW96aWFhZW5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg0NzQwNDMsImV4cCI6MjA0NDA1MDA0M30.HmrU4Qqfv9R5KP6-EEFKYq3KZ-Wl1B3fZ6ULjdOtfmE';

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Supabase inicializado:', supabase);
