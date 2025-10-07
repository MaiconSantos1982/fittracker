// Aguardar carregamento completo da página
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado, inicializando auth.js');
    
    // Toggle entre login e registro
    const showRegisterBtn = document.getElementById('showRegister');
    const showLoginBtn = document.getElementById('showLogin');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Mostrando formulário de registro');
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        });
    }
    
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Mostrando formulário de login');
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
        });
    }

    // Login
    const loginFormSubmit = document.getElementById('loginFormSubmit');
    if (loginFormSubmit) {
        loginFormSubmit.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Tentando fazer login...');
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) throw error;

                console.log('Login bem-sucedido:', data);

                // Buscar tipo de usuário
                const { data: profile, error: profileError } = await supabase
                    .from('fit_profiles')
                    .select('user_type')
                    .eq('id', data.user.id)
                    .single();

                if (profileError) {
                    console.error('Erro ao buscar perfil:', profileError);
                    throw profileError;
                }

                console.log('Tipo de usuário:', profile.user_type);

                // Salvar Player ID do OneSignal
                await saveOneSignalPlayerId(data.user.id);

                // Redirecionar baseado no tipo
                if (profile.user_type === 'personal') {
                    window.location.href = 'dashboard-personal.html';
                } else {
                    window.location.href = 'dashboard-aluno.html';
                }
            } catch (error) {
                console.error('Erro no login:', error);
                alert('Erro ao fazer login: ' + error.message);
            }
        });
    }

    // Registro
    const registerFormSubmit = document.getElementById('registerFormSubmit');
    if (registerFormSubmit) {
        registerFormSubmit.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Tentando registrar usuário...');
            
            const name = document.getElementById('regName').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const userType = document.getElementById('regUserType').value;

            if (!userType) {
                alert('Por favor, selecione o tipo de usuário');
                return;
            }

            console.log('Dados:', { name, email, userType });

            try {
                // 1. Criar usuário no Auth
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

                console.log('Usuário criado no Auth:', data);

                // 2. Criar perfil na tabela fit_profiles
                const { error: profileError } = await supabase
                    .from('fit_profiles')
                    .insert({
                        id: data.user.id,
                        email: email,
                        full_name: name,
                        user_type: userType
                    });

                if (profileError) {
                    console.error('Erro ao criar perfil:', profileError);
                    throw profileError;
                }

                console.log('Perfil criado com sucesso!');

                alert('Conta criada com sucesso! Faça login para continuar.');
                
                // Voltar para tela de login
                registerForm.style.display = 'none';
                loginForm.style.display = 'block';
                
                // Limpar formulário
                registerFormSubmit.reset();
                
            } catch (error) {
                console.error('Erro no registro:', error);
                alert('Erro ao criar conta: ' + error.message);
            }
        });
    }
});

// Salvar Player ID do OneSignal
async function saveOneSignalPlayerId(userId) {
    try {
        if (typeof OneSignalDeferred !== 'undefined') {
            OneSignalDeferred.push(async function(OneSignal) {
                const playerId = await OneSignal.User.PushSubscription.id;
                if (playerId) {
                    await supabase.from('fit_push_subscriptions').upsert({
                        user_id: userId,
                        player_id: playerId
                    });
                }
            });
        }
    } catch (error) {
        console.log('OneSignal não configurado ainda');
    }
}

// Verificar se usuário está logado (para páginas internas)
async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user && window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
        window.location.href = 'index.html';
    }
    return user;
}

// Logout
async function logout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}
