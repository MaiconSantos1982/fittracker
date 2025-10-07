// Supabase Configuration
const SUPABASE_URL = 'https://cwucfwsxdncqoziaaenm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3dWNmd3N4ZG5jcW96aWFhZW5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg0NzQwNDMsImV4cCI6MjA0NDA1MDA0M30.HmrU4Qqfv9R5KP6-EEFKYq3KZ-Wl1B3fZ6ULjdOtfmE';

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Supabase inicializado:', supabase);

// OneSignal Push Notifications
const ONESIGNAL_APP_ID = '84b83497-ef94-41bd-82e1-c5085a205bce';

// Função para pedir permissão de notificação
async function solicitarPermissaoNotificacao() {
    if (typeof OneSignal !== 'undefined') {
        try {
            await OneSignal.Notifications.requestPermission();
            console.log('Permissão de notificação concedida');
        } catch (error) {
            console.log('Permissão de notificação negada', error);
        }
    }
}

// Registrar usuário no OneSignal após login
async function registrarUsuarioOneSignal(userId, userType) {
    if (typeof OneSignal !== 'undefined') {
        try {
            await OneSignal.User.addTag("user_type", userType);
            await OneSignal.User.addTag("user_id", userId);
            console.log('Usuário registrado no OneSignal:', userId);
        } catch (error) {
            console.error('Erro ao registrar no OneSignal:', error);
        }
    }
}
