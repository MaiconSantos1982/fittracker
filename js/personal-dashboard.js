/* ========================================
   VARIÁVEIS GLOBAIS
======================================== */
let currentUser = null;
let currentAlunos = [];
let selectedAlunoId = null;
let currentAlunoDetailsId = null;

/* ========================================
   INICIALIZAÇÃO
======================================== */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando Dashboard Personal...');
    
    currentUser = await checkAuth();
    
    if (!currentUser) {
        console.error('❌ Usuário não autenticado');
        window.location.href = 'login.html';
        return;
    }
    
    console.log('✅ Usuário autenticado:', currentUser);
    
    await loadDashboardData();
    await loadAlunos();
    setupNavigation();
    loadAlunoSelects();
});

/* ========================================
   NAVEGAÇÃO
======================================== */
function setupNavigation() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    
    // Links do menu
    document.querySelectorAll('#sidebar a[data-section]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.closest('a').dataset.section;
            showSection(section);
            
            // Atualizar classe active
            document.querySelectorAll('#sidebar a').forEach(a => a.classList.remove('active'));
            e.target.closest('a').classList.add('active');
            
            // Fechar sidebar no mobile
            if (window.innerWidth < 769) {
                closeSidebar();
            }
        });
    });
    
    // Botão hamburguer (mobile)
    if (sidebarCollapse) {
        sidebarCollapse.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }
    
    // Overlay click fecha sidebar
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }
}

function showSection(sectionName) {
    console.log('📍 Navegando para:', sectionName);
    
    // Esconder todas
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Mostrar selecionada
    const section = document.getElementById(`section-${sectionName}`);
    if (section) {
        section.style.display = 'block';
    }
    
    // Atualizar título
    const titles = {
        'dashboard': 'Dashboard',
        'alunos': 'Gerenciar Alunos',
        'treinos': 'Gerenciar Treinos',
        'dietas': 'Gerenciar Dietas',
        'medidas': 'Medidas e Evolução',
        'agenda': 'Agenda de Consultas',
        'notificacoes': 'Enviar Notificações'
    };
    
    document.getElementById('currentSection').textContent = titles[sectionName] || 'Dashboard';
    
    // Carregar dados da seção
    switch(sectionName) {
        case 'treinos':
            loadTreinos();
            break;
        case 'dietas':
            loadDietas();
            break;
        case 'agenda':
            loadAgenda();
            break;
    }
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('sidebar-overlay').classList.remove('active');
}

/* ========================================
   DASHBOARD - CARDS
======================================== */
async function loadDashboardData() {
    try {
        console.log('📊 Carregando dados do dashboard...');
        
        // Total de alunos
        const { data: alunos, error: alunosError } = await supabase
            .from('fit_alunos')
            .select('*')
            .eq('personal_id', currentUser.id);

        if (alunosError) throw alunosError;
        
        document.getElementById('totalAlunos').textContent = alunos?.length || 0;
        document.getElementById('alunosAtivos').textContent = alunos?.filter(a => a.ativo)?.length || 0;

        // Total de treinos
        const { data: treinos, error: treinosError } = await supabase
            .from('fit_treinos')
            .select('*')
            .eq('personal_id', currentUser.id);

        if (treinosError) throw treinosError;
        
        document.getElementById('totalTreinos').textContent = treinos?.length || 0;

        // Consultas hoje
        const today = new Date().toISOString().split('T')[0];
        const { data: consultas, error: consultasError } = await supabase
            .from('fit_agenda')
            .select('*')
            .eq('personal_id', currentUser.id)
            .gte('data_hora', `${today}T00:00:00`)
            .lte('data_hora', `${today}T23:59:59`);

        if (consultasError) throw consultasError;
        
        document.getElementById('consultasHoje').textContent = consultas?.length || 0;
        
        console.log('✅ Dashboard carregado!');
        
    } catch (error) {
        console.error('❌ Erro ao carregar dashboard:', error);
    }
}

/* ========================================
   ALUNOS
======================================== */
async function loadAlunos() {
    try {
        console.log('👥 Carregando alunos...');
        
        const { data, error } = await supabase
            .from('fit_alunos')
            .select(`
                *,
                profile:profile_id (
                    full_name,
                    email,
                    phone
                )
            `)
            .eq('personal_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        currentAlunos = data || [];
        console.log('✅ Alunos carregados:', currentAlunos.length);
        
        renderAlunosTable(currentAlunos);
    } catch (error) {
        console.error('❌ Erro ao carregar alunos:', error);
    }
}

function renderAlunosTable(alunos) {
    const container = document.getElementById('alunosContainer');
    
    if (!alunos || alunos.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i> Nenhum aluno cadastrado ainda.
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = alunos.map(aluno => `
        <div class="col-md-6 col-lg-4">
            <div class="card h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h5 class="card-title mb-1">${aluno.profile?.full_name || 'Nome não informado'}</h5>
                            <small class="text-muted">${aluno.profile?.email || ''}</small>
                        </div>
                        <span class="badge ${aluno.ativo ? 'bg-success' : 'bg-secondary'}">
                            ${aluno.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                    </div>
                    
                    ${aluno.profile?.phone ? `<p class="mb-2"><i class="bi bi-telephone"></i> ${aluno.profile.phone}</p>` : ''}
                    ${aluno.objetivo ? `<p class="mb-2"><i class="bi bi-target"></i> ${aluno.objetivo}</p>` : ''}
                    
                    <div class="d-flex gap-2 mt-3">
                        <button class="btn btn-sm btn-primary flex-fill" onclick="viewAlunoDetails('${aluno.id}')">
                            <i class="bi bi-eye"></i> Ver Detalhes
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteAluno('${aluno.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Filtrar alunos
function filterAlunos() {
    const searchTerm = document.getElementById('searchAluno').value.toLowerCase();
    
    if (!searchTerm) {
        renderAlunosTable(currentAlunos);
        document.getElementById('searchResults').textContent = '';
        return;
    }
    
    const filtered = currentAlunos.filter(aluno => {
        const nome = aluno.profile?.full_name?.toLowerCase() || '';
        const email = aluno.profile?.email?.toLowerCase() || '';
        const telefone = aluno.profile?.phone?.toLowerCase() || '';
        
        return nome.includes(searchTerm) || email.includes(searchTerm) || telefone.includes(searchTerm);
    });
    
    renderAlunosTable(filtered);
    document.getElementById('searchResults').textContent = `${filtered.length} resultado(s) encontrado(s)`;
}

// Abrir modal
function openAlunoModal() {
    document.getElementById('alunoForm').reset();
}

// Salvar aluno
async function saveAluno() {
    try {
        const nome = document.getElementById('alunoNome').value;
        const email = document.getElementById('alunoEmail').value;
        const telefone = document.getElementById('alunoTelefone').value;
        const dataNasc = document.getElementById('alunoDataNasc').value;
        const senha = document.getElementById('alunoSenha').value;
        const objetivo = document.getElementById('alunoObjetivo').value;
        const obs = document.getElementById('alunoObs').value;

        if (!nome || !email || !senha) {
            alert('Preencha os campos obrigatórios!');
            return;
        }

        // Criar usuário
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: senha,
            options: {
                data: { full_name: nome, user_type: 'aluno' }
            }
        });

        if (authError) throw authError;

        // Criar perfil
        const { error: profileError } = await supabase
            .from('fit_profiles')
            .insert({
                id: authData.user.id,
                full_name: nome,
                email: email,
                phone: telefone || null,
                user_type: 'aluno'
            });

        if (profileError) throw profileError;

        // Vincular aluno
        const { error: alunoError } = await supabase
            .from('fit_alunos')
            .insert({
                personal_id: currentUser.id,
                profile_id: authData.user.id,
                data_nascimento: dataNasc || null,
                objetivo: objetivo,
                observacoes: obs,
                ativo: true
            });

        if (alunoError) throw alunoError;

        alert('✅ Aluno cadastrado com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('alunoModal')).hide();
        loadAlunos();
        loadAlunoSelects();
        loadDashboardData();
        
    } catch (error) {
        console.error('❌ Erro ao salvar aluno:', error);
        alert('Erro ao salvar aluno: ' + error.message);
    }
}

// Deletar aluno
async function deleteAluno(alunoId) {
    if (!confirm('⚠️ Tem certeza que deseja excluir este aluno?')) return;

    try {
        const { error } = await supabase
            .from('fit_alunos')
            .delete()
            .eq('id', alunoId);

        if (error) throw error;

        alert('✅ Aluno excluído!');
        loadAlunos();
        loadDashboardData();
    } catch (error) {
        alert('Erro ao excluir: ' + error.message);
    }
}

// Ver detalhes
function viewAlunoDetails(alunoId) {
    alert('Funcionalidade em desenvolvimento');
}

/* ========================================
   CARREGAR SELECTS
======================================== */
async function loadAlunoSelects() {
    const { data: alunos } = await supabase
        .from('fit_alunos')
        .select(`id, profile:profile_id(full_name)`)
        .eq('personal_id', currentUser.id)
        .eq('ativo', true);

    const selects = ['treinoAluno', 'dietaAluno', 'medidaAluno', 'agendaAluno', 'alunoMedidasSelect'];

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Selecione um aluno...</option>';
            alunos?.forEach(aluno => {
                select.innerHTML += `<option value="${aluno.id}">${aluno.profile?.full_name}</option>`;
            });
        }
    });
}

/* ========================================
   TREINOS, DIETAS, MEDIDAS, AGENDA
   (Implementação básica - expandir conforme necessário)
======================================== */
function openTreinoModal() { console.log('Abrir modal treino'); }
function addExercicioField() { console.log('Adicionar exercício'); }
function saveTreino() { console.log('Salvar treino'); }
function loadTreinos() { console.log('Carregar treinos'); }

function openDietaModal() { console.log('Abrir modal dieta'); }
function addRefeicaoField() { console.log('Adicionar refeição'); }
function saveDieta() { console.log('Salvar dieta'); }
function loadDietas() { console.log('Carregar dietas'); }

function openMedidaModal() { console.log('Abrir modal medidas'); }
function saveMedida() { console.log('Salvar medidas'); }
function loadMedidas() { console.log('Carregar medidas'); }

function openAgendaModal() { console.log('Abrir modal agenda'); }
function saveAgenda() { console.log('Salvar agenda'); }
function loadAgenda() { console.log('Carregar agenda'); }

console.log('✅ Personal Dashboard JS carregado!');
