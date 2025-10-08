/* ========================================
   VARIÁVEIS GLOBAIS
======================================== */
let currentUser = null;
let currentAlunos = [];
let selectedAlunoId = null;

/* ========================================
   INICIALIZAÇÃO
======================================== */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando Dashboard Personal...');
    
    // Verificar autenticação
    currentUser = await checkAuth();
    
    if (!currentUser) {
        console.error('❌ Usuário não autenticado');
        window.location.href = 'login.html';
        return;
    }
    
    console.log('✅ Usuário autenticado:', currentUser);
    
    // Inicializar dashboard
    await loadDashboardData();
    await loadAlunos();
    setupNavigation();
    loadAlunoSelects();
    setupModals();
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
}

function showSection(sectionName) {
    // Esconder todas as seções
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Mostrar seção selecionada
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
    
    // Recarregar dados da seção
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

// Fechar sidebar ao clicar no overlay
document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);

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
        
        console.log('👥 Alunos:', alunos);
        
        document.getElementById('totalAlunos').textContent = alunos?.length || 0;
        document.getElementById('alunosAtivos').textContent = alunos?.filter(a => a.ativo)?.length || 0;

        // Total de treinos
        const { data: treinos, error: treinosError } = await supabase
            .from('fit_treinos')
            .select('*')
            .eq('personal_id', currentUser.id);

        if (treinosError) throw treinosError;
        
        console.log('💪 Treinos:', treinos);
        
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
        
        console.log('📅 Consultas hoje:', consultas);
        
        document.getElementById('consultasHoje').textContent = consultas?.length || 0;
        
        console.log('✅ Dashboard carregado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao carregar dashboard:', error);
    }
}

/* ========================================
   ALUNOS - CRUD
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
        console.log('✅ Alunos carregados:', currentAlunos);
        
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

// Filtrar alunos na busca
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
        
        return nome.includes(searchTerm) || 
               email.includes(searchTerm) || 
               telefone.includes(searchTerm);
    });
    
    renderAlunosTable(filtered);
    document.getElementById('searchResults').textContent = `${filtered.length} resultado(s) encontrado(s)`;
}

// Abrir modal de cadastro
function openAlunoModal() {
    document.getElementById('alunoForm').reset();
    document.getElementById('alunoId').value = '';
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

        // 1. Criar usuário no Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: senha,
            options: {
                data: {
                    full_name: nome,
                    user_type: 'aluno'
                }
            }
        });

        if (authError) throw authError;

        // 2. Criar perfil
        const { data: profile, error: profileError } = await supabase
            .from('fit_profiles')
            .insert({
                id: authData.user.id,
                full_name: nome,
                email: email,
                phone: telefone,
                user_type: 'aluno'
            })
            .select()
            .single();

        if (profileError) throw profileError;

        // 3. Vincular aluno ao personal
        const { error: alunoError } = await supabase
            .from('fit_alunos')
            .insert({
                personal_id: currentUser.id,
                profile_id: profile.id,
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

        alert('✅ Aluno excluído com sucesso!');
        loadAlunos();
        loadDashboardData();
    } catch (error) {
        console.error('❌ Erro ao excluir aluno:', error);
        alert('Erro ao excluir aluno: ' + error.message);
    }
}

// Ver detalhes do aluno
function viewAlunoDetails(alunoId) {
    selectedAlunoId = alunoId;
    // TODO: Implementar modal de detalhes
    alert('Funcionalidade em desenvolvimento');
}

/* ========================================
   CARREGAR SELECTS DE ALUNOS
======================================== */
async function loadAlunoSelects() {
    const { data: alunos } = await supabase
        .from('fit_alunos')
        .select(`
            id,
            profile:profile_id (
                full_name
            )
        `)
        .eq('personal_id', currentUser.id)
        .eq('ativo', true);

    const selects = [
        'treinoAluno',
        'dietaAluno',
        'medidaAluno',
        'agendaAluno',
        'alunoMedidasSelect'
    ];

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
   MODALS - SETUP
======================================== */
function setupModals() {
    // Limpar forms ao fechar modals
    const modals = ['alunoModal', 'treinoModal', 'dietaModal', 'medidaModal', 'agendaModal'];
    
    modals.forEach(modalId => {
        const modalEl = document.getElementById(modalId);
        if (modalEl) {
            modalEl.addEventListener('hidden.bs.modal', () => {
                const form = modalEl.querySelector('form');
                if (form) form.reset();
            });
        }
    });
}

function openTreinoModal() {
    document.getElementById('treinoForm').reset();
    document.getElementById('exerciciosContainer').innerHTML = getExercicioTemplate();
}

function openDietaModal() {
    document.getElementById('dietaForm').reset();
    document.getElementById('refeicoesContainer').innerHTML = getRefeicaoTemplate();
}

function openMedidaModal() {
    document.getElementById('medidaForm').reset();
    document.getElementById('medidaData').value = new Date().toISOString().split('T')[0];
}

function openAgendaModal() {
    document.getElementById('agendaForm').reset();
}

/* ========================================
   TREINOS
======================================== */
function getExercicioTemplate() {
    return `
        <div class="exercicio-item card mb-2 p-3">
            <div class="row">
                <div class="col-md-6 mb-2">
                    <label>Nome do Exercício</label>
                    <input type="text" class="form-control exercicio-nome" required placeholder="Ex: Supino reto">
                </div>
                <div class="col-md-3 mb-2">
                    <label>Séries</label>
                    <input type="number" class="form-control exercicio-series" required placeholder="3">
                </div>
                <div class="col-md-3 mb-2">
                    <label>Repetições</label>
                    <input type="text" class="form-control exercicio-reps" required placeholder="10-12">
                </div>
                <div class="col-md-4 mb-2">
                    <label>Descanso</label>
                    <input type="text" class="form-control exercicio-descanso" placeholder="60s">
                </div>
                <div class="col-md-8 mb-2">
                    <label>Vídeo Demonstrativo</label>
                    <input type="file" class="form-control exercicio-video" accept="video/*">
                </div>
                <div class="col-12">
                    <label>Observações</label>
                    <textarea class="form-control exercicio-obs" rows="2" placeholder="Técnica, dicas, etc."></textarea>
                </div>
            </div>
            <button type="button" class="btn btn-sm btn-danger mt-2" onclick="this.closest('.exercicio-item').remove()">
                <i class="bi bi-trash"></i> Remover
            </button>
        </div>
    `;
}

function addExercicioField() {
    document.getElementById('exerciciosContainer').insertAdjacentHTML('beforeend', getExercicioTemplate());
}

async function saveTreino() {
    try {
        const alunoId = document.getElementById('treinoAluno').value;
        const nome = document.getElementById('treinoNome').value;
        const descricao = document.getElementById('treinoDesc').value;

        if (!alunoId || !nome) {
            alert('Preencha os campos obrigatórios!');
            return;
        }

        // Criar treino
        const { data: treino, error: treinoError } = await supabase
            .from('fit_treinos')
            .insert({
                aluno_id: alunoId,
                personal_id: currentUser.id,
                nome: nome,
                descricao: descricao
            })
            .select()
            .single();

        if (treinoError) throw treinoError;

        // Adicionar exercícios
        const exercicioItems = document.querySelectorAll('.exercicio-item');
        let ordem = 1;

        for (const item of exercicioItems) {
            const nomeExerc = item.querySelector('.exercicio-nome').value;
            const series = item.querySelector('.exercicio-series').value;
            const reps = item.querySelector('.exercicio-reps').value;
            const descanso = item.querySelector('.exercicio-descanso').value;
            const obs = item.querySelector('.exercicio-obs').value;

            await supabase.from('fit_exercicios').insert({
                treino_id: treino.id,
                nome: nomeExerc,
                series: parseInt(series),
                repeticoes: reps,
                descanso: descanso,
                observacoes: obs,
                ordem: ordem++
            });
        }

        alert('✅ Treino criado com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('treinoModal')).hide();
        loadTreinos();
        loadDashboardData();
    } catch (error) {
        console.error('❌ Erro ao salvar treino:', error);
        alert('Erro ao salvar treino: ' + error.message);
    }
}

async function loadTreinos() {
    try {
        const { data: treinos, error } = await supabase
            .from('fit_treinos')
            .select(`
                *,
                aluno:aluno_id (
                    profile:profile_id (
                        full_name
                    )
                )
            `)
            .eq('personal_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        renderTreinos(treinos);
    } catch (error) {
        console.error('❌ Erro ao carregar treinos:', error);
    }
}

function renderTreinos(treinos) {
    const container = document.getElementById('treinosList');
    
    if (!treinos || treinos.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> Nenhum treino cadastrado ainda.
            </div>
        `;
        return;
    }

    container.innerHTML = treinos.map(treino => `
        <div class="card mb-3">
            <div class="card-body">
                <h5>${treino.nome}</h5>
                <p class="text-muted mb-2">Aluno: ${treino.aluno?.profile?.full_name || 'N/A'}</p>
                ${treino.descricao ? `<p>${treino.descricao}</p>` : ''}
                <button class="btn btn-sm btn-danger" onclick="deleteTreino('${treino.id}')">
                    <i class="bi bi-trash"></i> Excluir
                </button>
            </div>
        </div>
    `).join('');
}

async function deleteTreino(treinoId) {
    if (!confirm('Tem certeza?')) return;

    try {
        await supabase.from('fit_treinos').delete().eq('id', treinoId);
        alert('Treino excluído!');
        loadTreinos();
        loadDashboardData();
    } catch (error) {
        alert('Erro ao excluir treino');
    }
}

/* ========================================
   DIETAS
======================================== */
function getRefeicaoTemplate() {
    return `
        <div class="refeicao-item card mb-2 p-3">
            <div class="row">
                <div class="col-md-6 mb-2">
                    <label>Tipo de Refeição</label>
                    <select class="form-select refeicao-tipo">
                        <option>Café da Manhã</option>
                        <option>Lanche da Manhã</option>
                        <option>Almoço</option>
                        <option>Lanche da Tarde</option>
                        <option>Jantar</option>
                        <option>Ceia</option>
                    </select>
                </div>
                <div class="col-md-6 mb-2">
                    <label>Horário</label>
                    <input type="time" class="form-control refeicao-horario">
                </div>
                <div class="col-12 mb-2">
                    <label>Alimentos</label>
                    <textarea class="form-control refeicao-alimentos" rows="2" required></textarea>
                </div>
                <div class="col-12">
                    <label>Observações</label>
                    <textarea class="form-control refeicao-obs" rows="1"></textarea>
                </div>
            </div>
            <button type="button" class="btn btn-sm btn-danger mt-2" onclick="this.closest('.refeicao-item').remove()">
                <i class="bi bi-trash"></i> Remover
            </button>
        </div>
    `;
}

function addRefeicaoField() {
    document.getElementById('refeicoesContainer').insertAdjacentHTML('beforeend', getRefeicaoTemplate());
}

async function saveDieta() {
    try {
        const alunoId = document.getElementById('dietaAluno').value;
        const nome = document.getElementById('dietaNome').value;
        const descricao = document.getElementById('dietaDesc').value;
        const dataInicio = document.getElementById('dietaInicio').value;
        const dataFim = document.getElementById('dietaFim').value;

        if (!alunoId || !nome) {
            alert('Preencha os campos obrigatórios!');
            return;
        }

        const { data: dieta, error: dietaError } = await supabase
            .from('fit_dietas')
            .insert({
                aluno_id: alunoId,
                personal_id: currentUser.id,
                nome: nome,
                descricao: descricao,
                data_inicio: dataInicio,
                data_fim: dataFim,
                ativa: true
            })
            .select()
            .single();

        if (dietaError) throw dietaError;

        // Adicionar refeições
        const refeicaoItems = document.querySelectorAll('.refeicao-item');

        for (const item of refeicaoItems) {
            const tipo = item.querySelector('.refeicao-tipo').value;
            const horario = item.querySelector('.refeicao-horario').value;
            const alimentos = item.querySelector('.refeicao-alimentos').value;
            const obs = item.querySelector('.refeicao-obs').value;

            await supabase.from('fit_refeicoes').insert({
                dieta_id: dieta.id,
                tipo_refeicao: tipo,
                horario: horario,
                alimentos: alimentos,
                observacoes: obs
            });
        }

        alert('✅ Dieta criada com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('dietaModal')).hide();
        loadDietas();
    } catch (error) {
        console.error('❌ Erro ao salvar dieta:', error);
        alert('Erro ao salvar dieta: ' + error.message);
    }
}

async function loadDietas() {
    try {
        const { data: dietas, error } = await supabase
            .from('fit_dietas')
            .select(`
                *,
                aluno:aluno_id (
                    profile:profile_id (
                        full_name
                    )
                )
            `)
            .eq('personal_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        renderDietas(dietas);
    } catch (error) {
        console.error('❌ Erro ao carregar dietas:', error);
    }
}

function renderDietas(dietas) {
    const container = document.getElementById('dietasList');
    
    if (!dietas || dietas.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> Nenhuma dieta cadastrada ainda.
            </div>
        `;
        return;
    }

    container.innerHTML = dietas.map(dieta => `
        <div class="card mb-3">
            <div class="card-body">
                <h5>${dieta.nome}</h5>
                <p class="text-muted mb-2">Aluno: ${dieta.aluno?.profile?.full_name || 'N/A'}</p>
                ${dieta.descricao ? `<p>${dieta.descricao}</p>` : ''}
                <span class="badge ${dieta.ativa ? 'bg-success' : 'bg-secondary'}">
                    ${dieta.ativa ? 'Ativa' : 'Inativa'}
                </span>
            </div>
        </div>
    `).join('');
}

/* ========================================
   MEDIDAS
======================================== */
async function saveMedida() {
    try {
        const medidaData = {
            aluno_id: document.getElementById('medidaAluno').value,
            personal_id: currentUser.id,
            data_medicao: document.getElementById('medidaData').value,
            peso: document.getElementById('medidaPeso').value || null,
            altura: document.getElementById('medidaAltura').value || null,
            percentual_gordura: document.getElementById('medidaGordura').value || null,
            pescoco: document.getElementById('medidaPescoco').value || null,
            ombros: document.getElementById('medidaOmbros').value || null,
            peitoral: document.getElementById('medidaPeitoral').value || null,
            cintura: document.getElementById('medidaCintura').value || null,
            abdomen: document.getElementById('medidaAbdomen').value || null,
            quadril: document.getElementById('medidaQuadril').value || null,
            braco_direito: document.getElementById('medidaBracoD').value || null,
            braco_esquerdo: document.getElementById('medidaBracoE').value || null,
            coxa_direita: document.getElementById('medidaCoxaD').value || null,
            coxa_esquerda: document.getElementById('medidaCoxaE').value || null,
            panturrilha_direita: document.getElementById('medidaPanturrilhaD').value || null,
            panturrilha_esquerda: document.getElementById('medidaPanturrilhaE').value || null,
            observacoes: document.getElementById('medidaObs').value
        };

        const { error } = await supabase
            .from('fit_medidas')
            .insert(medidaData);

        if (error) throw error;

        alert('✅ Medidas registradas com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('medidaModal')).hide();
        loadMedidas();
    } catch (error) {
        console.error('❌ Erro ao salvar medidas:', error);
        alert('Erro ao salvar medidas: ' + error.message);
    }
}

async function loadMedidas() {
    const alunoId = document.getElementById('alunoMedidasSelect').value;
    if (!alunoId) {
        document.getElementById('medidasContent').innerHTML = `
            <div class="alert alert-info">Selecione um aluno para ver as medidas</div>
        `;
        return;
    }

    try {
        const { data: medidas, error } = await supabase
            .from('fit_medidas')
            .select('*')
            .eq('aluno_id', alunoId)
            .order('data_medicao', { ascending: false });

        if (error) throw error;

        renderMedidas(medidas);
    } catch (error) {
        console.error('❌ Erro ao carregar medidas:', error);
    }
}

function renderMedidas(medidas) {
    const container = document.getElementById('medidasContent');
    
    if (!medidas || medidas.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> Nenhuma medida registrada para este aluno.
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Peso</th>
                        <th>Altura</th>
                        <th>% Gordura</th>
                        <th>IMC</th>
                    </tr>
                </thead>
                <tbody>
                    ${medidas.map(m => {
                        const imc = m.peso && m.altura ? (m.peso / Math.pow(m.altura/100, 2)).toFixed(1) : '-';
                        return `
                            <tr>
                                <td>${new Date(m.data_medicao).toLocaleDateString('pt-BR')}</td>
                                <td>${m.peso || '-'} kg</td>
                                <td>${m.altura || '-'} cm</td>
                                <td>${m.percentual_gordura || '-'}%</td>
                                <td>${imc}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/* ========================================
   AGENDA
======================================== */
async function saveAgenda() {
    try {
        const agendaData = {
            personal_id: currentUser.id,
            aluno_id: document.getElementById('agendaAluno').value,
            data_hora: document.getElementById('agendaDataHora').value,
            tipo_consulta: document.getElementById('agendaTipo').value,
            status: document.getElementById('agendaStatus').value,
            observacoes: document.getElementById('agendaObs').value
        };

        const { error } = await supabase
            .from('fit_agenda')
            .insert(agendaData);

        if (error) throw error;

        alert('✅ Consulta agendada com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('agendaModal')).hide();
        loadAgenda();
        loadDashboardData();
    } catch (error) {
        console.error('❌ Erro ao salvar agenda:', error);
        alert('Erro ao agendar consulta: ' + error.message);
    }
}

async function loadAgenda() {
    try {
        const { data: consultas, error } = await supabase
            .from('fit_agenda')
            .select(`
                *,
                aluno:aluno_id (
                    profile:profile_id (
                        full_name
                    )
                )
            `)
            .eq('personal_id', currentUser.id)
            .order('data_hora', { ascending: true });

        if (error) throw error;

        renderAgenda(consultas);
    } catch (error) {
        console.error('❌ Erro ao carregar agenda:', error);
    }
}

function renderAgenda(consultas) {
    const container = document.getElementById('agendaCalendar');
    
    if (!consultas || consultas.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> Nenhuma consulta agendada.
            </div>
        `;
        return;
    }

    container.innerHTML = consultas.map(c => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between">
                    <div>
                        <h5>${c.aluno?.profile?.full_name || 'Aluno'}</h5>
                        <p class="mb-1"><i class="bi bi-calendar"></i> ${new Date(c.data_hora).toLocaleString('pt-BR')}</p>
                        <p class="mb-1"><i class="bi bi-tag"></i> ${c.tipo_consulta}</p>
                        ${c.observacoes ? `<p class="mb-0 text-muted"><small>${c.observacoes}</small></p>` : ''}
                    </div>
                    <div>
                        <span class="badge bg-${c.status === 'agendada' ? 'primary' : c.status === 'confirmada' ? 'success' : c.status === 'realizada' ? 'info' : 'secondary'}">
                            ${c.status}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

console.log('✅ Personal Dashboard JS carregado!');
