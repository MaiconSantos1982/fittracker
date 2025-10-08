// Salvar Player ID do OneSignal
async function saveOneSignalPlayerId(userId) {
    OneSignalDeferred.push(async function(OneSignal) {
        const playerId = await OneSignal.User.PushSubscription.id;
        if (playerId) {
            await supabase.from('fit_push_subscriptions').upsert({ // ATUALIZADO
                user_id: userId,
                player_id: playerId
            });
        }
    });
}

// Login
document.getElementById('loginFormSubmit')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        // Buscar tipo de usuário
        const { data: profile } = await supabase
            .from('fit_profiles') // ATUALIZADO
            .select('user_type')
            .eq('id', data.user.id)
            .single();

        // Salvar Player ID do OneSignal
        await saveOneSignalPlayerId(data.user.id);

        // Redirecionar baseado no tipo
        if (profile.user_type === 'personal') {
            window.location.href = 'dashboard-personal.html';
        } else {
            window.location.href = 'dashboard-aluno.html';
        }
    } catch (error) {
        alert('Erro ao fazer login: ' + error.message);
    }
});

// Registro
document.getElementById('registerFormSubmit')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const userType = document.getElementById('regUserType').value;

    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                    user_type: userType
                }
            }
        });

        if (error) throw error;

        // Criar perfil
        await supabase.from('fit_profiles').insert({ // ATUALIZADO
            id: data.user.id,
            email: email,
            full_name: name,
            user_type: userType
        });

        alert('Conta criada com sucesso! Faça login para continuar.');
        document.getElementById('showLogin').click();
    } catch (error) {
        alert('Erro ao criar conta: ' + error.message);
    }
});
