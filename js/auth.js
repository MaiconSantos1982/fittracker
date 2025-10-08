// Toggle entre login e registro
document.getElementById('showRegister')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
});

document.getElementById('showLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
});

// Login
async function login(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    console.log('Tentando login com:', email);
    
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
        
        console.log('Perfil encontrado:', profile);
        
        // Redirecionar baseado no tipo
        if (profile.user_type === 'personal') {
            console.log('Redirecionando para dashboard personal...');
            window.location.href = '/dashboard-personal.html';
        } else if (profile.user_type === 'aluno') {
            console.log('Redirecionando para dashboard aluno...');
            window.location.href = '/dashboard-aluno.html';
        } else {
            throw new Error('Tipo de usuário inválido: ' + profile.user_type);
        }
        
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        alert('Erro ao fazer login: ' + error.message);
    }
}

// Registro
async function register(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const phone = document.getElementById('registerPhone').value.trim();
    const password = document.getElementById('registerPassword').value;
    const userType = document.getElementById('registerUserType').value;
    
    if (!userType) {
        alert('Selecione o tipo de usuário!');
        return;
    }
    
    console.log('Tentando registrar:', email, userType);
    
    try {
        // Criar usuário no Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                    user_type: userType
                }
            }
        });
        
        if (authError) throw authError;
        
        console.log('Usuário criado no Auth:', authData);
        
        // Criar perfil
        const { error: profileError } = await supabase
            .from('fit_profiles')
            .insert({
                id: authData.user.id,
                email: email,
                full_name: name,
                phone: phone || null,
                user_type: userType
            });
        
        if (profileError) throw profileError;
        
        console.log('Perfil criado com sucesso');
        
        alert('Conta criada com sucesso! Faça login para continuar.');
        
        // Voltar para tela de login
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
        
        // Limpar formulário
        document.getElementById('registerName').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPhone').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('registerUserType').value = '';
        
    } catch (error) {
        console.error('Erro ao registrar:', error);
        alert('Erro ao registrar: ' + error.message);
    }
}

// Verificar autenticação
async function checkAuth() {
    console.log('Verificando autenticação...');
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
        console.error('Erro ao verificar sessão:', error);
        window.location.href = '/index.html';
        return null;
    }
    
    if (!session) {
        console.log('Nenhuma sessão encontrada, redirecionando...');
        window.location.href = '/index.html';
        return null;
    }
    
    console.log('Sessão ativa:', session.user);
    
    // Buscar dados completos do perfil
    const { data: profile, error: profileError } = await supabase
        .from('fit_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
    
    if (profileError) {
        console.error('Erro ao carregar perfil:', profileError);
        return session.user;
    }
    
    console.log('Perfil carregado:', profile);
    
    return {
        ...session.user,
        ...profile
    };
}

// Logout
async function logout() {
    console.log('Fazendo logout...');
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
        console.error('Erro ao fazer logout:', error);
        alert('Erro ao sair: ' + error.message);
        return;
    }
    
    console.log('Logout bem-sucedido');
    window.location.href = '/index.html';
}
