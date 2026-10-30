// Configuración de cuentas de EDGIM (Supabase).
// Déjalo vacío para usar la app sin inicio de sesión (datos solo en este navegador).
// Para activar las cuentas sigue los pasos de "Inicio de sesión" en README.md.
// La "anon public key" es pública por diseño: las reglas de supabase-setup.sql protegen los datos.
// NUNCA pongas aquí la "service_role key".
window.EDGIM_CONFIG = {
  supabaseUrl: "",      // ej. "https://abcdefgh.supabase.co"
  supabaseAnonKey: "",  // ej. "eyJhbGciOi..."
};
