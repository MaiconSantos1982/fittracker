let currentUser = null;
let currentAlunos = [];
let selectedAlunoId = null;
let currentAlunoDetailsId = null;

// VARIÁVEIS GLOBAIS PARA PROTOCOLOS (NOVAS)
let currentProtocoloId = null;
let currentTreinoTemp = null;
let exerciciosTempList = [];
let currentExercicioVideoUrl = null;

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inicializando dashboard do personal...');
    currentUser = await checkAuth();
    console.log('Usuário atual:', currentUser);
    
    loadDashboardData();
    loadAlunos();
    setupNavigation();
    loadAlunoSelects();
});

// Navegação entre seções
function setupNavigation() {
    const overlay = document.getElementById('sidebar-overlay');
    
    document.querySelectorAll('#sidebar a[data-section]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.closest('a').dataset.section;
            showSection(section);
            
            // Atualizar classe active
            document.querySelectorAll('#sidebar a').forEach(a => a.classList.remove('active'));
            e.target.closest('a').classList.add('active');
            
            // Fechar sidebar no mobile
            if (overlay) {
                document.getElementById('sidebar').classList.remove('active');
            }
        });
    });

    document.getElementById('sidebarCollapse')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });
}

function showSection(sectionName) {
    // Esconde todas as seções
    document.querySelectorAll('.content-section').forEach(s => {
        s.style.display = 'none';
    });
    
    // Mostra a seção selecionada
    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // Atualiza título
    const titles = {
        'dashboard': 'Dashboard',
        'alunos': 'Gerenciar Alunos',
        'protocolos': 'Protocolos de Treino',
        'treinos': 'Treinos',
        'dietas': 'Dietas',
        'medidas': 'Medidas e Evolução',
        'agenda': 'Agenda',
        'notificacoes': 'Notificações'
    };
    document.getElementById('currentSection').textContent = titles[sectionName] || sectionName;
    
    // Carrega dados específicos da seção
    if (sectionName === 'alunos') loadAlunos();
    if (sectionName === 'protocolos') {
        loadAlunosSelect('filtroAlunoProtocolos');
        loadProtocolos();
    }
    if (sectionName === 'treinos') loadTreinos();
    if (sectionName === 'dietas') loadDietas();
    if (sectionName === 'medidas') loadAlunoSelects();
    if (sectionName === 'agenda') loadAgenda();
}

// Dashboard Data
async function loadDashboardData() {
    try {
        const { data: alunos, error: alunosError } = await supabase
            .from('fit_alunos')
            .select('*', { count: 'exact' })
            .eq('personal_id', currentUser.id);

        if (!alunosError && alunos) {
            document.getElementById('totalAlunos').textContent = alunos.length;
            document.getElementById('alunosAtivos').textContent = alunos.filter(a => a.ativo).length;
        }

        const { data: treinos } = await supabase
            .from('fit_treinos')
            .select('*', { count: 'exact' })
            .eq('personal_id', currentUser.id);

        if (treinos) {
            document.getElementById('totalTreinos').textContent = treinos.length;
        }

        const today = new Date().toISOString().split('T')[0];
        const { data: consultas } = await supabase
            .from('fit_agenda')
            .select('*', { count: 'exact' })
            .eq('personal_id', currentUser.id)
            .gte('data_consulta', today + ' 00:00:00')
            .lte('data_consulta', today + ' 23:59:59');

        if (consultas) {
            document.getElementById('consultasHoje').textContent = consultas.length;
        }
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

// Gerenciar Alunos
async function loadAlunos() {
    try {
        const { data: alunos, error } = await supabase
            .from('fit_alunos')
            .select(`
                *,
                profile:profile_id (
                    email,
                    full_name
                )
            `)
            .eq('personal_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        currentAlunos = alunos;
        renderAlunosTable(alunos);
    } catch (error) {
        console.error('Erro ao carregar alunos:', error);
    }
}

function renderAlunosTable(alunos) {
    const tbody = document.getElementById('alunosTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!alunos || alunos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum aluno cadastrado</td></tr>';
        return;
    }

    alunos.forEach(aluno => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${aluno.profile?.full_name || 'Sem nome'}</td>
            <td>${aluno.profile?.email || '-'}</td>
            <td>${aluno.telefone || '-'}</td>
            <td>
                <span class="badge bg-${aluno.ativo ? 'success' : 'secondary'}">
                    ${aluno.ativo ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editAluno('${aluno.id}')">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteAluno('${aluno.id}')">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function saveAluno() {
    try {
        const aluno = {
            personal_id: currentUser.id,
            nome: document.getElementById('alunoNome').value,
            email: document.getElementById('alunoEmail').value,
            telefone: document.getElementById('alunoTelefone').value,
            data_nascimento: document.getElementById('alunoDataNasc').value,
            objetivo: document.getElementById('alunoObjetivo').value,
            observacoes: document.getElementById('alunoObs').value,
            ativo: true
        };

        const { error } = await supabase
            .from('fit_alunos')
            .insert(aluno);

        if (error) throw error;

        alert('Aluno cadastrado com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('cadastrarAlunoModal')).hide();
        loadAlunos();
        loadAlunoSelects();
    } catch (error) {
        console.error('Erro ao salvar aluno:', error);
        alert('Erro ao cadastrar aluno: ' + error.message);
    }
}

function editAluno(id) {
    console.log('Editar aluno:', id);
}

async function deleteAluno(id) {
    if (!confirm('Tem certeza que deseja excluir este aluno?')) return;

    try {
        const { error } = await supabase
            .from('fit_alunos')
            .delete()
            .eq('id', id);

        if (error) throw error;

        alert('Aluno excluído com sucesso!');
        loadAlunos();
    } catch (error) {
        console.error('Erro ao excluir aluno:', error);
        alert('Erro ao excluir aluno: ' + error.message);
    }
}

// Funções auxiliares
async function loadAlunoSelects() {
    const selects = ['treinoAluno', 'dietaAluno', 'alunoMedidasSelect', 'protocoloAluno'];
    
    for (const selectId of selects) {
        const select = document.getElementById(selectId);
        if (!select) continue;

        try {
            const { data: alunos, error } = await supabase
                .from('fit_alunos')
                .select(`
                    id,
                    profile:profile_id(full_name)
                `)
                .eq('personal_id', currentUser.id)
                .eq('ativo', true);

            if (error) throw error;

            // Manter apenas a primeira opção
            select.innerHTML = '<option value="">Selecione...</option>';
            
            alunos?.forEach(aluno => {
                const option = document.createElement('option');
                option.value = aluno.id;
                option.textContent = aluno.profile?.full_name || 'Sem nome';
                select.appendChild(option);
            });
        } catch (error) {
            console.error(`Erro ao carregar select ${selectId}:`, error);
        }
    }
}


// ============================================
// CARREGAR TREINOS
// ============================================
async function loadTreinos() {
    try {
        const { data: treinos, error } = await supabase
            .from('fit_treinos')
            .select(`
                *,
                aluno:fit_alunos(
                    id,
                    profile:profile_id(full_name)
                )
            `)
            .eq('personal_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        renderTreinosList(treinos);
    } catch (error) {
        console.error('Erro ao carregar treinos:', error);
    }
}

function renderTreinosList(treinos) {
    const container = document.getElementById('treinosList');
    if (!container) return;

    if (!treinos || treinos.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nenhum treino cadastrado ainda.</div>';
        return;
    }

    container.innerHTML = '';

    treinos.forEach(treino => {
        const nomeAluno = treino.aluno?.profile?.full_name || 'Aluno não encontrado';
        
        const card = document.createElement('div');
        card.className = 'card mb-3';
        card.innerHTML = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h5 class="mb-1">${treino.nome}</h5>
                        <small class="text-muted">
                            <i class="bi bi-person"></i> ${nomeAluno}
                            ${treino.descricao ? ` | ${treino.descricao}` : ''}
                        </small>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-primary" onclick="viewTreino('${treino.id}')">
                            <i class="bi bi-eye"></i> Ver
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteTreinoLegado('${treino.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function viewTreino(id) {
    alert('Função de visualizar treino em desenvolvimento. ID: ' + id);
}

async function deleteTreinoLegado(id) {
    if (!confirm('Tem certeza que deseja excluir este treino?')) return;

    try {
        const { error } = await supabase
            .from('fit_treinos')
            .delete()
            .eq('id', id);

        if (error) throw error;

        alert('Treino excluído com sucesso!');
        loadTreinos();
    } catch (error) {
        console.error('Erro ao excluir treino:', error);
        alert('Erro ao excluir treino: ' + error.message);
    }
}

// ============================================
// CARREGAR DIETAS
// ============================================
async function loadDietas() {
    try {
        const { data: dietas, error } = await supabase
            .from('fit_dietas')
            .select(`
                *,
                aluno:fit_alunos(
                    id,
                    profile:profile_id(full_name)
                )
            `)
            .eq('personal_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        renderDietasList(dietas);
    } catch (error) {
        console.error('Erro ao carregar dietas:', error);
    }
}

function renderDietasList(dietas) {
    const container = document.getElementById('dietasList');
    if (!container) return;

    if (!dietas || dietas.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nenhuma dieta cadastrada ainda.</div>';
        return;
    }

    container.innerHTML = '';

    dietas.forEach(dieta => {
        const nomeAluno = dieta.aluno?.profile?.full_name || 'Aluno não encontrado';
        
        const card = document.createElement('div');
        card.className = 'card mb-3';
        card.innerHTML = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h5 class="mb-1">${dieta.nome}</h5>
                        <small class="text-muted">
                            <i class="bi bi-person"></i> ${nomeAluno}
                        </small>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-primary" onclick="viewDieta('${dieta.id}')">
                            <i class="bi bi-eye"></i> Ver
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteDietaConfirm('${dieta.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function viewDieta(id) {
    alert('Função de visualizar dieta em desenvolvimento. ID: ' + id);
}

async function deleteDietaConfirm(id) {
    if (!confirm('Tem certeza que deseja excluir esta dieta?')) return;

    try {
        const { error } = await supabase
            .from('fit_dietas')
            .delete()
            .eq('id', id);

        if (error) throw error;

        alert('Dieta excluída com sucesso!');
        loadDietas();
    } catch (error) {
        console.error('Erro ao excluir dieta:', error);
        alert('Erro ao excluir dieta: ' + error.message);
    }
}

// ============================================
// CARREGAR AGENDA
// ============================================
async function loadAgenda() {
    try {
        const { data: consultas, error } = await supabase
            .from('fit_agenda')
            .select(`
                *,
                aluno:fit_alunos(
                    id,
                    profile:profile_id(full_name)
                )
            `)
            .eq('personal_id', currentUser.id)
            .order('data_consulta', { ascending: true });

        if (error) throw error;

        renderAgendaList(consultas);
    } catch (error) {
        console.error('Erro ao carregar agenda:', error);
    }
}

function renderAgendaList(consultas) {
    const container = document.getElementById('agendaList');
    if (!container) return;

    if (!consultas || consultas.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nenhuma consulta agendada.</div>';
        return;
    }

    container.innerHTML = '';

    consultas.forEach(consulta => {
        const nomeAluno = consulta.aluno?.profile?.full_name || 'Aluno não encontrado';
        const dataConsulta = new Date(consulta.data_consulta).toLocaleString('pt-BR');
        
        const card = document.createElement('div');
        card.className = 'card mb-3';
        card.innerHTML = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${nomeAluno}</h6>
                        <small class="text-muted">
                            <i class="bi bi-calendar"></i> ${dataConsulta}
                            ${consulta.observacoes ? `<br>${consulta.observacoes}` : ''}
                        </small>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-danger" onclick="deleteConsulta('${consulta.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

async function deleteConsulta(id) {
    if (!confirm('Tem certeza que deseja excluir esta consulta?')) return;

    try {
        const { error } = await supabase
            .from('fit_agenda')
            .delete()
            .eq('id', id);

        if (error) throw error;

        alert('Consulta excluída com sucesso!');
        loadAgenda();
    } catch (error) {
        console.error('Erro ao excluir consulta:', error);
        alert('Erro ao excluir consulta: ' + error.message);
    }
}

// ============================================
// IMPLEMENTAR saveTreinoLegado() e saveDieta()
// ============================================
async function saveTreinoLegado() {
    try {
        const alunoId = document.getElementById('treinoAluno').value;
        const nome = document.getElementById('treinoNomeLegado').value;
        const descricao = document.getElementById('treinoDescricaoLegado').value;

        if (!alunoId || !nome) {
            alert('Preencha todos os campos obrigatórios!');
            return;
        }

        const { error } = await supabase
            .from('fit_treinos')
            .insert({
                personal_id: currentUser.id,
                aluno_id: alunoId,
                nome: nome,
                descricao: descricao
            });

        if (error) throw error;

        alert('Treino criado com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('criarTreinoModal')).hide();
        loadTreinos();
        document.getElementById('treinoFormLegado').reset();
    } catch (error) {
        console.error('Erro ao salvar treino:', error);
        alert('Erro ao salvar treino: ' + error.message);
    }
}

async function saveDieta() {
    try {
        const alunoId = document.getElementById('dietaAluno').value;
        const nome = document.getElementById('dietaNome').value;

        if (!alunoId || !nome) {
            alert('Preencha todos os campos obrigatórios!');
            return;
        }

        const { error } = await supabase
            .from('fit_dietas')
            .insert({
                personal_id: currentUser.id,
                aluno_id: alunoId,
                nome: nome
            });

        if (error) throw error;

        alert('Dieta criada com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('criarDietaModal')).hide();
        loadDietas();
        document.getElementById('dietaForm').reset();
    } catch (error) {
        console.error('Erro ao salvar dieta:', error);
        alert('Erro ao salvar dieta: ' + error.message);
    }
}

async function logout() {
    try {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
    }
}
// ============================================
// FUNÇÕES DE PROTOCOLOS
// ============================================

async function loadProtocolos() {
    try {
        const alunoFiltro = document.getElementById('filtroAlunoProtocolos')?.value;
        const statusFiltro = document.getElementById('filtroStatusProtocolos')?.value;

        let query = supabase
    .from('fit_protocolos')
    .select(`
        *,
        aluno:fit_alunos(
            id,
            profile:profile_id(full_name)
        )
    `)
            .eq('personal_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (alunoFiltro) {
            query = query.eq('aluno_id', alunoFiltro);
        }

        if (statusFiltro !== '') {
            query = query.eq('ativo', statusFiltro === 'true');
        }

        const { data: protocolos, error } = await query;

        if (error) throw error;

        renderProtocolos(protocolos);
    } catch (error) {
        console.error('Erro ao carregar protocolos:', error);
        alert('Erro ao carregar protocolos: ' + error.message);
    }
}

function renderProtocolos(protocolos) {
    const container = document.getElementById('protocolosList');
    if (!container) return;

    if (!protocolos || protocolos.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nenhum protocolo cadastrado ainda.</div>';
        return;
    }

    container.innerHTML = '';

    protocolos.forEach(protocolo => {
        const dataInicio = protocolo.data_inicio ? new Date(protocolo.data_inicio).toLocaleDateString('pt-BR') : '-';
        const dataFim = protocolo.data_fim ? new Date(protocolo.data_fim).toLocaleDateString('pt-BR') : '-';
        const nomeAluno = protocolo.aluno?.profile?.full_name || 'Aluno não encontrado';
        
        const card = document.createElement('div');
        card.className = 'card mb-3';
        card.innerHTML = `
            <div class="card-header" style="cursor: pointer;" 
                 data-bs-toggle="collapse" 
                 data-bs-target="#protocolo-${protocolo.id}" 
                 aria-expanded="false">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi bi-chevron-right collapse-icon" style="transition: transform 0.2s;"></i>
                            <div>
                                <h5 class="mb-0">${protocolo.nome}</h5>
                                <small class="text-muted">${nomeAluno}</small>
                            </div>
                        </div>
                    </div>
                    <div class="d-flex gap-2 align-items-center">
    <span class="badge bg-${protocolo.ativo ? 'success' : 'secondary'}">
        ${protocolo.ativo ? 'Ativo' : 'Inativo'}
    </span>
    <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); openGerenciarTreinosModal('${protocolo.id}', '${protocolo.nome.replace(/'/g, "\\'")}')">
        <i class="bi bi-plus-circle"></i> Adicionar Treino
    </button>
    <button class="btn btn-sm btn-warning" onclick="event.stopPropagation(); editProtocolo('${protocolo.id}')">
        <i class="bi bi-pencil"></i>
    </button>
    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteProtocolo('${protocolo.id}')">
        <i class="bi bi-trash"></i>
    </button>
</div>
                </div>
            </div>
            
            <div class="collapse" id="protocolo-${protocolo.id}">
                <div class="card-body bg-light">
                    <!-- Informações do Protocolo -->
                    <div class="row mb-3 pb-3 border-bottom">
                        <div class="col-md-3">
                            <strong>Objetivo:</strong><br>
                            <span class="text-muted">${protocolo.objetivo}</span>
                            ${protocolo.objetivo_outros ? `<br><small class="text-muted">${protocolo.objetivo_outros}</small>` : ''}
                        </div>
                        <div class="col-md-3">
                            <strong>Início:</strong><br>
                            <span class="text-muted">${dataInicio}</span>
                        </div>
                        <div class="col-md-3">
                            <strong>Término Previsto:</strong><br>
                            <span class="text-muted">${dataFim}</span>
                        </div>
                        <div class="col-md-3">
                            <strong>Criado em:</strong><br>
                            <span class="text-muted">${new Date(protocolo.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                    </div>
                    
                    <!-- Lista de Treinos -->
                    <h6 class="mb-3"><i class="bi bi-list-check"></i> Treinos deste Protocolo</h6>
                    <div id="treinos-protocolo-${protocolo.id}">
                        <div class="text-center py-3">
                            <div class="spinner-border spinner-border-sm" role="status"></div>
                            <span class="ms-2">Carregando treinos...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);

        // Carregar treinos quando expandir
        const collapseElement = document.getElementById(`protocolo-${protocolo.id}`);
        let treinosCarregados = false;

        collapseElement.addEventListener('show.bs.collapse', async () => {
            if (!treinosCarregados) {
                await loadTreinosDoProtocolo(protocolo.id);
                treinosCarregados = true;
            }
            
            // Rotacionar ícone
            const icon = collapseElement.previousElementSibling.querySelector('.collapse-icon');
            icon.style.transform = 'rotate(90deg)';
        });

        collapseElement.addEventListener('hide.bs.collapse', () => {
            const icon = collapseElement.previousElementSibling.querySelector('.collapse-icon');
            icon.style.transform = 'rotate(0deg)';
        });
    });
}

async function loadTreinosDoProtocolo(protocoloId) {
    try {
        const { data: treinos, error } = await supabase
            .from('fit_treinos')
            .select(`
                *,
                exercicios_count:fit_exercicios(count)
            `)
            .eq('protocolo_id', protocoloId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        renderTreinosDoProtocolo(protocoloId, treinos);
    } catch (error) {
        console.error('Erro ao carregar treinos:', error);
        document.getElementById(`treinos-protocolo-${protocoloId}`).innerHTML = 
            '<div class="alert alert-danger">Erro ao carregar treinos</div>';
    }
}

function renderTreinosDoProtocolo(protocoloId, treinos) {
    const container = document.getElementById(`treinos-protocolo-${protocoloId}`);
    if (!container) return;

    if (!treinos || treinos.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nenhum treino cadastrado. Clique em "Adicionar Treino" acima.</div>';
        return;
    }

    let html = '';

    treinos.forEach((treino, index) => {
        const numExercicios = treino.exercicios_count?.[0]?.count || 0;
        
        html += `
            <div class="card mb-2 shadow-sm">
                <div class="card-header bg-white" style="cursor: pointer;"
                     data-bs-toggle="collapse" 
                     data-bs-target="#treino-${treino.id}" 
                     aria-expanded="false">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="flex-grow-1">
                            <i class="bi bi-chevron-right collapse-icon-treino" style="transition: transform 0.2s;"></i>
                            <strong>${treino.nome}</strong>
                            ${treino.descricao ? `<br><small class="text-muted">${treino.descricao}</small>` : ''}
                        </div>
                        <div class="d-flex gap-2 align-items-center" onclick="event.stopPropagation();">
                            <span class="badge bg-info">${numExercicios} exercícios</span>
                            <button class="btn btn-sm btn-warning" onclick="editTreinoProtocolo('${treino.id}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteTreino('${treino.id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="collapse" id="treino-${treino.id}">
                    <div class="card-body">
                        <div id="exercicios-treino-${treino.id}">
                            <div class="text-center py-2">
                                <div class="spinner-border spinner-border-sm" role="status"></div>
                                <span class="ms-2">Carregando exercícios...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Adicionar eventos aos treinos
    treinos.forEach(treino => {
        const collapseElement = document.getElementById(`treino-${treino.id}`);
        let exerciciosCarregados = false;

        collapseElement.addEventListener('show.bs.collapse', async () => {
            if (!exerciciosCarregados) {
                await loadExerciciosTreino(treino.id);
                exerciciosCarregados = true;
            }

            const icon = collapseElement.previousElementSibling.querySelector('.collapse-icon-treino');
            icon.style.transform = 'rotate(90deg)';
        });

        collapseElement.addEventListener('hide.bs.collapse', () => {
            const icon = collapseElement.previousElementSibling.querySelector('.collapse-icon-treino');
            icon.style.transform = 'rotate(0deg)';
        });
    });
}

// ============================================
// FUNÇÕES DO MODAL GERENCIAR TREINOS
// ============================================

async function openGerenciarTreinosModal(protocoloId, protocoloNome) {
    currentProtocoloId = protocoloId;
    document.getElementById('currentProtocoloId').value = protocoloId;
    document.getElementById('gerenciarTreinosTitle').textContent = 'Gerenciar Treinos';
    document.getElementById('gerenciarTreinosSubtitle').textContent = `Protocolo: ${protocoloNome}`;
    
    await loadTreinosProtocolo(protocoloId);
    
    new bootstrap.Modal(document.getElementById('gerenciarTreinosModal')).show();
}

async function loadTreinosProtocolo(protocoloId) {
    try {
        const { data: treinos, error } = await supabase
            .from('fit_treinos')
            .select(`
                *,
                exercicios_count:fit_exercicios(count)
            `)
            .eq('protocolo_id', protocoloId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        renderTreinosProtocolo(treinos);
    } catch (error) {
        console.error('Erro ao carregar treinos:', error);
        alert('Erro ao carregar treinos: ' + error.message);
    }
}

function renderTreinosProtocolo(treinos) {
    const container = document.getElementById('treinosProtocoloList');
    if (!container) return;

    if (!treinos || treinos.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nenhum treino adicionado ainda. Clique em "Adicionar Treino" para começar.</div>';
        return;
    }

    container.innerHTML = '';

    treinos.forEach((treino) => {
        const card = document.createElement('div');
        card.className = 'card mb-3';
        const numExercicios = treino.exercicios_count?.[0]?.count || 0;
        
        card.innerHTML = `
            <div class="card-header d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-0">
                        <button class="btn btn-link text-decoration-none p-0" type="button" 
                                data-bs-toggle="collapse" data-bs-target="#treino-modal-${treino.id}" 
                                aria-expanded="false">
                            <i class="bi bi-chevron-right collapse-icon"></i>
                            ${treino.nome}
                        </button>
                    </h6>
                    ${treino.descricao ? `<small class="text-muted">${treino.descricao}</small>` : ''}
                </div>
                <div>
                    <span class="badge bg-info me-2">${numExercicios} exercícios</span>
                    <button class="btn btn-sm btn-warning" onclick="event.stopPropagation(); editTreinoProtocolo('${treino.id}')">
                        <i class="bi bi-pencil"></i> Editar Treino
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteTreinoConfirm('${treino.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
            <div class="collapse" id="treino-modal-${treino.id}">
                <div class="card-body">
                    <div id="exercicios-treino-${treino.id}">
                        <div class="text-center py-3">
                            <div class="spinner-border spinner-border-sm" role="status"></div>
                            <span class="ms-2">Carregando exercícios...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);

        // Adicionar evento para carregar exercícios quando expandir
        const collapseElement = document.getElementById(`treino-modal-${treino.id}`);
        collapseElement.addEventListener('show.bs.collapse', async () => {
            await loadExerciciosTreino(treino.id);
        });

        // Rotacionar ícone ao expandir/colapsar
        collapseElement.addEventListener('show.bs.collapse', function() {
            const icon = this.previousElementSibling.querySelector('.collapse-icon');
            icon.classList.remove('bi-chevron-right');
            icon.classList.add('bi-chevron-down');
        });
        collapseElement.addEventListener('hide.bs.collapse', function() {
            const icon = this.previousElementSibling.querySelector('.collapse-icon');
            icon.classList.remove('bi-chevron-down');
            icon.classList.add('bi-chevron-right');
        });
    });
}

// ============================================
// MODAL GERENCIAR TREINOS (NO PROTOCOLO)
// ============================================

async function openGerenciarTreinosModal(protocoloId, protocoloNome) {
    currentProtocoloId = protocoloId;
    document.getElementById('currentProtocoloId').value = protocoloId;
    document.getElementById('gerenciarTreinosTitle').textContent = 'Gerenciar Treinos';
    document.getElementById('gerenciarTreinosSubtitle').textContent = `Protocolo: ${protocoloNome}`;
    
    await loadTreinosProtocolo(protocoloId);
    
    new bootstrap.Modal(document.getElementById('gerenciarTreinosModal')).show();
}

async function loadTreinosProtocolo(protocoloId) {
    try {
        const { data: treinos, error } = await supabase
            .from('fit_treinos')
            .select(`
                *,
                exercicios_count:fit_exercicios(count)
            `)
            .eq('protocolo_id', protocoloId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        renderTreinosProtocolo(treinos);
    } catch (error) {
        console.error('Erro ao carregar treinos:', error);
        alert('Erro ao carregar treinos: ' + error.message);
    }
}

function renderTreinosProtocolo(treinos) {
    const container = document.getElementById('treinosProtocoloList');
    if (!container) return;

    if (!treinos || treinos.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nenhum treino adicionado ainda. Clique em "Adicionar Treino" para começar.</div>';
        return;
    }

    container.innerHTML = '';

    treinos.forEach((treino) => {
        const card = document.createElement('div');
        card.className = 'card mb-3';
        const numExercicios = treino.exercicios_count?.[0]?.count || 0;
        
        card.innerHTML = `
            <div class="card-header d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-0">
                        <button class="btn btn-link text-decoration-none p-0" type="button" 
                                data-bs-toggle="collapse" data-bs-target="#treino-modal-${treino.id}">
                            <i class="bi bi-chevron-right collapse-icon"></i>
                            ${treino.nome}
                        </button>
                    </h6>
                    ${treino.descricao ? `<small class="text-muted">${treino.descricao}</small>` : ''}
                </div>
                <div>
                    <span class="badge bg-info me-2">${numExercicios} exercícios</span>
                    <button class="btn btn-sm btn-warning" onclick="event.stopPropagation(); editTreinoProtocolo('${treino.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteTreinoConfirm('${treino.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
            <div class="collapse" id="treino-modal-${treino.id}">
                <div class="card-body">
                    <div id="exercicios-treino-${treino.id}">
                        <div class="text-center py-3">
                            <div class="spinner-border spinner-border-sm"></div>
                            <span class="ms-2">Carregando exercícios...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);

        const collapseElement = document.getElementById(`treino-modal-${treino.id}`);
        collapseElement.addEventListener('show.bs.collapse', async () => {
            await loadExerciciosTreino(treino.id);
        });
    });
}

async function loadExerciciosTreino(treinoId) {
    try {
        const { data: exercicios, error } = await supabase
            .from('fit_exercicios')
            .select('*')
            .eq('treino_id', treinoId)
            .order('ordem', { ascending: true });

        if (error) throw error;

        const modalOpen = document.getElementById('gerenciarTreinosModal')?.classList.contains('show');
        
        if (modalOpen) {
            renderExerciciosModal(treinoId, exercicios);
        } else {
            renderExerciciosTreino(treinoId, exercicios);
        }
    } catch (error) {
        console.error('Erro ao carregar exercícios:', error);
    }
}

function renderExerciciosModal(treinoId, exercicios) {
    const container = document.getElementById(`exercicios-treino-${treinoId}`);
    if (!container) return;

    if (!exercicios || exercicios.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nenhum exercício cadastrado neste treino.</div>';
        return;
    }

    let html = '<table class="table table-sm table-hover"><thead><tr><th>#</th><th>Exercício</th><th>Grupo</th><th>Séries</th><th>Método</th><th>Ações</th></tr></thead><tbody>';

    exercicios.forEach((ex, index) => {
        const seriesInfo = ex.series_detalhes?.length > 0 
            ? `${ex.series_detalhes.length}x ${ex.series_detalhes[0].numero || '-'}`
            : `${ex.numero_series || '-'} séries`;

        html += `<tr><td>${index + 1}</td><td><strong>${ex.nome}</strong></td><td><span class="badge bg-secondary">${ex.grupo_muscular || '-'}</span></td><td>${seriesInfo}</td><td>${ex.metodo || '-'}</td><td>
            <button class="btn btn-sm btn-warning" onclick="editExercicioModal('${ex.id}', '${treinoId}')"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-danger" onclick="deleteExercicioModal('${ex.id}', '${treinoId}')"><i class="bi bi-trash"></i></button>
        </td></tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

async function editExercicioModal(exercicioId, treinoId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById('gerenciarTreinosModal'));
    if (modal) modal.hide();
    setTimeout(() => editExercicio(exercicioId, treinoId), 300);
}

async function deleteExercicioModal(exercicioId, treinoId) {
    if (!confirm('Excluir este exercício?')) return;
    try {
        await supabase.from('fit_exercicios').delete().eq('id', exercicioId);
        alert('Exercício excluído!');
        await loadExerciciosTreino(treinoId);
        await loadTreinosProtocolo(currentProtocoloId);
    } catch (error) {
        alert('Erro: ' + error.message);
    }
}

async function deleteTreinoConfirm(treinoId) {
    if (!confirm('Excluir este treino?')) return;
    try {
        const { data: treino } = await supabase.from('fit_treinos').select('protocolo_id').eq('id', treinoId).single();
        await supabase.from('fit_treinos').delete().eq('id', treinoId);
        alert('Treino excluído!');
        if (treino) await loadTreinosProtocolo(treino.protocolo_id);
    } catch (error) {
        alert('Erro: ' + error.message);
    }
}

// ============================================
// ADICIONAR/EDITAR TREINO
// ============================================

function openAdicionarTreinoModal() {
    document.getElementById('treinoForm').reset();
    document.getElementById('treinoProtocoloId').value = currentProtocoloId;
    exerciciosTempList = [];
    renderExerciciosTempList();
    new bootstrap.Modal(document.getElementById('adicionarTreinoModal')).show();
}

async function saveTreino() {
    try {
        const protocoloId = document.getElementById('treinoProtocoloId').value;
        const nome = document.getElementById('treinoNome').value;
        const descricao = document.getElementById('treinoDescricao').value;

        if (!nome) return alert('Informe o nome do treino!');
        if (exerciciosTempList.length === 0) return alert('Adicione pelo menos um exercício!');

        const { data: protocolo } = await supabase.from('fit_protocolos').select('aluno_id').eq('id', protocoloId).single();

        let treinoId;

        if (window.editingTreinoId) {
            await supabase.from('fit_treinos').update({ nome, descricao }).eq('id', window.editingTreinoId);
            await supabase.from('fit_exercicios').delete().eq('treino_id', window.editingTreinoId);
            treinoId = window.editingTreinoId;
            window.editingTreinoId = null;
        } else {
            const { data: treino } = await supabase.from('fit_treinos').insert({
                protocolo_id: protocoloId,
                aluno_id: protocolo.aluno_id,
                personal_id: currentUser.id,
                nome, descricao
            }).select().single();
            treinoId = treino.id;
        }

        for (let i = 0; i < exerciciosTempList.length; i++) {
            const ex = { ...exerciciosTempList[i] };
            ex.treino_id = treinoId;
            ex.protocolo_id = protocoloId;
            ex.ordem = i + 1;
            await supabase.from('fit_exercicios').insert(ex);
        }

        alert('Treino salvo!');
        bootstrap.Modal.getInstance(document.getElementById('adicionarTreinoModal')).hide();
        loadTreinosProtocolo(protocoloId);
    } catch (error) {
        alert('Erro: ' + error.message);
    }
}

async function editTreinoProtocolo(treinoId) {
    try {
        const { data: treino } = await supabase.from('fit_treinos').select('*').eq('id', treinoId).single();
        document.getElementById('treinoProtocoloId').value = treino.protocolo_id;
        document.getElementById('treinoNome').value = treino.nome;
        document.getElementById('treinoDescricao').value = treino.descricao || '';

        const { data: exercicios } = await supabase.from('fit_exercicios').select('*').eq('treino_id', treinoId).order('ordem');
        exerciciosTempList = exercicios || [];
        renderExerciciosTempList();

        window.editingTreinoId = treinoId;
        new bootstrap.Modal(document.getElementById('adicionarTreinoModal')).show();
    } catch (error) {
        alert('Erro: ' + error.message);
    }
}

function renderExerciciosTempList() {
    const container = document.getElementById('exerciciosTreinoList');
    if (!container) return;

    if (exerciciosTempList.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nenhum exercício adicionado ainda</div>';
        return;
    }

    container.innerHTML = '';
    exerciciosTempList.forEach((ex, i) => {
        const card = document.createElement('div');
        card.className = 'card mb-2';
        card.innerHTML = `<div class="card-body d-flex justify-content-between">
            <div><strong>${i + 1}. ${ex.nome}</strong><br><small>${ex.grupo_muscular} | ${ex.numero_series} séries</small></div>
            <button class="btn btn-sm btn-danger" onclick="removerExercicioTemp(${i})"><i class="bi bi-trash"></i></button>
        </div>`;
        container.appendChild(card);
    });
}

function removerExercicioTemp(index) {
    exerciciosTempList.splice(index, 1);
    renderExerciciosTempList();
}

// ============================================
// ADICIONAR EXERCÍCIO
// ============================================

async function openAdicionarExercicioModal() {
    document.getElementById('exercicioForm').reset();
    document.getElementById('seriesDetalhesContainer').innerHTML = '';
    await loadGruposMusculares();
    document.getElementById('exercicioNumSeries').value = 4;
    gerarLinhasSeries();
    new bootstrap.Modal(document.getElementById('adicionarExercicioModal')).show();
}

async function loadGruposMusculares() {
    const { data } = await supabase.from('fit_grupos_musculares').select('*').order('nome');
    const select = document.getElementById('exercicioGrupoMuscular');
    select.innerHTML = '<option value="">Selecione...</option>';
    data?.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.id;
        opt.textContent = g.nome;
        select.appendChild(opt);
    });
}

async function loadExerciciosBiblioteca() {
    const grupoId = document.getElementById('exercicioGrupoMuscular').value;
    if (!grupoId) return;

    const { data } = await supabase.from('fit_exercicios_biblioteca').select('*').eq('grupo_muscular_id', grupoId).order('nome');
    const select = document.getElementById('exercicioBiblioteca');
    select.innerHTML = '<option value="">Selecione...</option>';
    data?.forEach(ex => {
        const opt = document.createElement('option');
        opt.value = ex.id;
        opt.textContent = ex.nome;
        select.appendChild(opt);
    });
}

function gerarLinhasSeries() {
    const num = parseInt(document.getElementById('exercicioNumSeries').value) || 1;
    const container = document.getElementById('seriesDetalhesContainer');
    container.innerHTML = '';
    for (let i = 1; i <= num; i++) adicionarLinhaSerie(i);
}

function adicionarLinhaSerie(num) {
    const container = document.getElementById('seriesDetalhesContainer');
    const row = document.createElement('div');
    row.className = 'row mb-2 serie-row';
    row.innerHTML = `
        <div class="col-md-2"><select class="form-select serie-unidade"><option>Repetições</option><option>Tempo</option></select></div>
        <div class="col-md-2"><input type="number" class="form-control serie-numero" placeholder="12"></div>
        <div class="col-md-2"><input type="text" class="form-control serie-carga" placeholder="20kg"></div>
        <div class="col-md-2"><select class="form-select serie-velocidade"><option>Moderada</option><option>Lenta</option><option>Rápida</option></select></div>
        <div class="col-md-1"><input type="number" class="form-control serie-pausa-min" placeholder="60"></div>
        <div class="col-md-1"><input type="number" class="form-control serie-pausa-max" placeholder="90"></div>
        <div class="col-md-2"><button class="btn btn-danger w-100" onclick="removerSerie(this)"><i class="bi bi-x"></i></button></div>
    `;
    container.appendChild(row);
}

function remover

async function loadExerciciosTreino(treinoId) {
    try {
        const { data: exercicios, error } = await supabase
            .from('fit_exercicios')
            .select('*')
            .eq('treino_id', treinoId)
            .order('ordem', { ascending: true });

        if (error) throw error;

        // Verificar se está dentro do modal gerenciarTreinos
        const modalOpen = document.getElementById('gerenciarTreinosModal').classList.contains('show');
        
        if (modalOpen) {
            renderExerciciosModal(treinoId, exercicios);
        } else {
            renderExerciciosTreino(treinoId, exercicios);
        }
    } catch (error) {
        console.error('Erro ao carregar exercícios:', error);
        document.getElementById(`exercicios-treino-${treinoId}`).innerHTML = 
            '<div class="alert alert-danger">Erro ao carregar exercícios</div>';
    }
}

function renderExerciciosModal(treinoId, exercicios) {
    const container = document.getElementById(`exercicios-treino-${treinoId}`);
    if (!container) return;

    if (!exercicios || exercicios.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nenhum exercício cadastrado neste treino.</div>';
        return;
    }

    let html = '<div class="table-responsive"><table class="table table-sm table-hover mb-0">';
    html += '<thead><tr>';
    html += '<th style="width: 40px;">#</th>';
    html += '<th>Exercício</th>';
    html += '<th>Grupo</th>';
    html += '<th>Séries</th>';
    html += '<th>Método</th>';
    html += '<th style="width: 120px;">Ações</th>';
    html += '</tr></thead><tbody>';

    exercicios.forEach((ex, index) => {
        const seriesInfo = ex.series_detalhes && ex.series_detalhes.length > 0 
            ? `${ex.series_detalhes.length}x ${ex.series_detalhes[0].numero || '-'} reps`
            : `${ex.numero_series || '-'} séries`;

        html += `<tr>`;
        html += `<td><strong>${index + 1}</strong></td>`;
        html += `<td>
            <strong>${ex.nome}</strong>
            ${ex.dica ? `<br><small class="text-muted"><i class="bi bi-lightbulb"></i> ${ex.dica.substring(0, 60)}${ex.dica.length > 60 ? '...' : ''}</small>` : ''}
        </td>`;
        html += `<td><span class="badge bg-secondary">${ex.grupo_muscular || '-'}</span></td>`;
        html += `<td>${seriesInfo}</td>`;
        html += `<td>${ex.metodo || '-'}</td>`;
        html += `<td>
            <button class="btn btn-sm btn-warning" onclick="editExercicioModal('${ex.id}', '${treinoId}')" title="Editar">
                <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteExercicioModal('${ex.id}', '${treinoId}')" title="Excluir">
                <i class="bi bi-trash"></i>
            </button>
        </td>`;
        html += `</tr>`;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

async function editExercicioModal(exercicioId, treinoId) {
    const gerenciarModal = bootstrap.Modal.getInstance(document.getElementById('gerenciarTreinosModal'));
    if (gerenciarModal) {
        gerenciarModal.hide();
    }

    setTimeout(async () => {
        await editExercicio(exercicioId, treinoId);
    }, 300);
}

async function deleteExercicioModal(exercicioId, treinoId) {
    if (!confirm('Tem certeza que deseja excluir este exercício?')) return;

    try {
        const { error } = await supabase
            .from('fit_exercicios')
            .delete()
            .eq('id', exercicioId);

        if (error) throw error;

        alert('Exercício excluído com sucesso!');
        
        const { data: exercicios, error: exError } = await supabase
            .from('fit_exercicios')
            .select('*')
            .eq('treino_id', treinoId)
            .order('ordem', { ascending: true });

        if (!exError) {
            renderExerciciosModal(treinoId, exercicios);
        }

        await loadTreinosProtocolo(currentProtocoloId);
    } catch (error) {
        console.error('Erro ao excluir exercício:', error);
        alert('Erro ao excluir exercício: ' + error.message);
    }
}

async function deleteTreinoConfirm(treinoId) {
    if (!confirm('Tem certeza que deseja excluir este treino?')) {
        return;
    }

    try {
        const { data: treino } = await supabase
            .from('fit_treinos')
            .select('protocolo_id')
            .eq('id', treinoId)
            .single();

        const { error } = await supabase
            .from('fit_treinos')
            .delete()
            .eq('id', treinoId);

        if (error) throw error;

        alert('Treino excluído com sucesso!');
        
        if (treino) {
            await loadTreinosProtocolo(treino.protocolo_id);
        }
    } catch (error) {
        console.error('Erro ao excluir treino:', error);
        alert('Erro ao excluir treino: ' + error.message);
    }
}

// ============================================
// FUNÇÕES DE ADICIONAR/EDITAR TREINO
// ============================================

function openAdicionarTreinoModal() {
    document.getElementById('treinoForm').reset();
    document.getElementById('treinoProtocoloId').value = currentProtocoloId;
    exerciciosTempList = [];
    renderExerciciosTempList();
    
    new bootstrap.Modal(document.getElementById('adicionarTreinoModal')).show();
}

async function openGerenciarTreinosModal(protocoloId, protocoloNome) {
    currentProtocoloId = protocoloId;
    document.getElementById('currentProtocoloId').value = protocoloId;
    document.getElementById('gerenciarTreinosTitle').textContent = 'Gerenciar Treinos';
    document.getElementById('gerenciarTreinosSubtitle').textContent = `Protocolo: ${protocoloNome}`;
    
    await loadTreinosProtocolo(protocoloId);
    
    new bootstrap.Modal(document.getElementById('gerenciarTreinosModal')).show();
}

async function loadTreinosProtocolo(protocoloId) {
    try {
        const { data: treinos, error } = await supabase
            .from('fit_treinos')
            .select(`
                *,
                exercicios_count:fit_exercicios(count)
            `)
            .eq('protocolo_id', protocoloId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        renderTreinosProtocolo(treinos);
    } catch (error) {
        console.error('Erro ao carregar treinos:', error);
        alert('Erro ao carregar treinos: ' + error.message);
    }
}

function renderTreinosProtocolo(treinos) {
    const container = document.getElementById('treinosProtocoloList');
    if (!container) return;

    if (!treinos || treinos.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nenhum treino adicionado ainda. Clique em "Adicionar Treino" para começar.</div>';
        return;
    }

    container.innerHTML = '';

    treinos.forEach((treino) => {
        const card = document.createElement('div');
        card.className = 'card mb-3';
        const numExercicios = treino.exercicios_count?.[0]?.count || 0;
        
        card.innerHTML = `
            <div class="card-header d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-0">
                        <button class="btn btn-link text-decoration-none p-0" type="button" 
                                data-bs-toggle="collapse" data-bs-target="#treino-${treino.id}" 
                                aria-expanded="false">
                            <i class="bi bi-chevron-right collapse-icon"></i>
                            ${treino.nome}
                        </button>
                    </h6>
                    ${treino.descricao ? `<small class="text-muted">${treino.descricao}</small>` : ''}
                </div>
                <div>
                    <span class="badge bg-info me-2">${numExercicios} exercícios</span>
                    <button class="btn btn-sm btn-warning" onclick="event.stopPropagation(); editTreinoProtocolo('${treino.id}')">
                        <i class="bi bi-pencil"></i> Editar Treino
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteTreinoConfirm('${treino.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
            <div class="collapse" id="treino-${treino.id}">
                <div class="card-body">
                    <div id="exercicios-treino-${treino.id}">
                        <div class="text-center py-3">
                            <div class="spinner-border spinner-border-sm" role="status"></div>
                            <span class="ms-2">Carregando exercícios...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);

        // Adicionar evento para carregar exercícios quando expandir
        const collapseElement = document.getElementById(`treino-${treino.id}`);
        collapseElement.addEventListener('show.bs.collapse', async () => {
            await loadExerciciosTreino(treino.id);
        });

        // Rotacionar ícone ao expandir/colapsar
        collapseElement.addEventListener('show.bs.collapse', function() {
            const icon = this.previousElementSibling.querySelector('.collapse-icon');
            icon.classList.remove('bi-chevron-right');
            icon.classList.add('bi-chevron-down');
        });
        collapseElement.addEventListener('hide.bs.collapse', function() {
            const icon = this.previousElementSibling.querySelector('.collapse-icon');
            icon.classList.remove('bi-chevron-down');
            icon.classList.add('bi-chevron-right');
        });
    });
}

async function loadExerciciosTreino(treinoId) {
    try {
        const { data: exercicios, error } = await supabase
            .from('fit_exercicios')
            .select('*')
            .eq('treino_id', treinoId)
            .order('ordem', { ascending: true });

        if (error) throw error;

        // Verificar se está dentro do modal gerenciarTreinos
        const modalOpen = document.getElementById('gerenciarTreinosModal').classList.contains('show');
        
        if (modalOpen) {
            renderExerciciosModal(treinoId, exercicios);
        } else {
            renderExerciciosTreino(treinoId, exercicios);
        }
    } catch (error) {
        console.error('Erro ao carregar exercícios:', error);
        document.getElementById(`exercicios-treino-${treinoId}`).innerHTML = 
            '<div class="alert alert-danger">Erro ao carregar exercícios</div>';
    }
}

function renderExerciciosModal(treinoId, exercicios) {
    const container = document.getElementById(`exercicios-treino-${treinoId}`);
    if (!container) return;

    if (!exercicios || exercicios.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nenhum exercício cadastrado neste treino.</div>';
        return;
    }

    let html = '<div class="table-responsive"><table class="table table-sm table-hover mb-0">';
    html += '<thead><tr>';
    html += '<th style="width: 40px;">#</th>';
    html += '<th>Exercício</th>';
    html += '<th>Grupo</th>';
    html += '<th>Séries</th>';
    html += '<th>Método</th>';
    html += '<th style="width: 120px;">Ações</th>';
    html += '</tr></thead><tbody>';

    exercicios.forEach((ex, index) => {
        const seriesInfo = ex.series_detalhes && ex.series_detalhes.length > 0 
            ? `${ex.series_detalhes.length}x ${ex.series_detalhes[0].numero || '-'} reps`
            : `${ex.numero_series || '-'} séries`;

        html += `<tr>`;
        html += `<td><strong>${index + 1}</strong></td>`;
        html += `<td>
            <strong>${ex.nome}</strong>
            ${ex.dica ? `<br><small class="text-muted"><i class="bi bi-lightbulb"></i> ${ex.dica.substring(0, 60)}${ex.dica.length > 60 ? '...' : ''}</small>` : ''}
        </td>`;
        html += `<td><span class="badge bg-secondary">${ex.grupo_muscular || '-'}</span></td>`;
        html += `<td>${seriesInfo}</td>`;
        html += `<td>${ex.metodo || '-'}</td>`;
        html += `<td>
            <button class="btn btn-sm btn-warning" onclick="editExercicioModal('${ex.id}', '${treinoId}')" title="Editar">
                <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteExercicioModal('${ex.id}', '${treinoId}')" title="Excluir">
                <i class="bi bi-trash"></i>
            </button>
        </td>`;
        html += `</tr>`;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

async function editExercicioModal(exercicioId, treinoId) {
    // Fechar modal de gerenciar treinos
    const gerenciarModal = bootstrap.Modal.getInstance(document.getElementById('gerenciarTreinosModal'));
    if (gerenciarModal) {
        gerenciarModal.hide();
    }

    // Esperar um pouco para garantir que o modal fechou
    setTimeout(async () => {
        await editExercicio(exercicioId, treinoId);
    }, 300);
}

async function deleteExercicioModal(exercicioId, treinoId) {
    if (!confirm('Tem certeza que deseja excluir este exercício?')) return;

    try {
        const { error } = await supabase
            .from('fit_exercicios')
            .delete()
            .eq('id', exercicioId);

        if (error) throw error;

        alert('Exercício excluído com sucesso!');
        
        // Recarregar lista no modal
        const { data: exercicios, error: exError } = await supabase
            .from('fit_exercicios')
            .select('*')
            .eq('treino_id', treinoId)
            .order('ordem', { ascending: true });

        if (!exError) {
            renderExerciciosModal(treinoId, exercicios);
        }

        // Recarregar contagem
        await loadTreinosProtocolo(currentProtocoloId);
    } catch (error) {
        console.error('Erro ao excluir exercício:', error);
        alert('Erro ao excluir exercício: ' + error.message);
    }
}

async function deleteTreinoConfirm(treinoId) {
    if (!confirm('Tem certeza que deseja excluir este treino?')) {
        return;
    }

    try {
        const { data: treino } = await supabase
            .from('fit_treinos')
            .select('protocolo_id')
            .eq('id', treinoId)
            .single();

        const { error } = await supabase
            .from('fit_treinos')
            .delete()
            .eq('id', treinoId);

        if (error) throw error;

        alert('Treino excluído com sucesso!');
        
        if (treino) {
            await loadTreinosProtocolo(treino.protocolo_id);
        }
    } catch (error) {
        console.error('Erro ao excluir treino:', error);
        alert('Erro ao excluir treino: ' + error.message);
    }
}

async function loadAlunosSelect(selectId) {
    try {
        const { data: alunos, error } = await supabase
            .from('fit_alunos')
            .select(`
                id,
                profile:profile_id(full_name)
            `)
            .eq('personal_id', currentUser.id)
            .eq('ativo', true);

        if (error) throw error;

        const select = document.getElementById(selectId);
        if (!select) return;

        while (select.options.length > 1) {
            select.remove(1);
        }

        alunos.forEach(aluno => {
            const option = document.createElement('option');
            option.value = aluno.id;
            option.textContent = aluno.profile?.full_name || 'Sem nome';
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar alunos no select:', error);
    }
}

async function openNovoProtocoloModal() {
    document.getElementById('protocoloForm').reset();
    document.getElementById('protocoloId').value = '';
    document.getElementById('protocoloModalTitle').textContent = 'Novo Protocolo';
    document.getElementById('protocoloAtivo').checked = true;
    document.getElementById('objetivoOutrosDiv').style.display = 'none';
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('protocoloDataInicio').value = today;
    
    await loadAlunosSelect('protocoloAluno');
    
    new bootstrap.Modal(document.getElementById('protocoloModal')).show();
}

function toggleObjetivoOutros() {
    const objetivo = document.getElementById('protocoloObjetivo').value;
    const outrosDiv = document.getElementById('objetivoOutrosDiv');
    
    if (objetivo === 'Outros') {
        outrosDiv.style.display = 'block';
        document.getElementById('protocoloObjetivoOutros').required = true;
    } else {
        outrosDiv.style.display = 'none';
        document.getElementById('protocoloObjetivoOutros').required = false;
    }
}

async function saveProtocolo() {
    try {
        const id = document.getElementById('protocoloId').value;
        const alunoId = document.getElementById('protocoloAluno').value;
        const nome = document.getElementById('protocoloNome').value;
        const objetivo = document.getElementById('protocoloObjetivo').value;
        const objetivoOutros = document.getElementById('protocoloObjetivoOutros').value;
        const dataInicio = document.getElementById('protocoloDataInicio').value;
        const dataFim = document.getElementById('protocoloDataFim').value;
        const ativo = document.getElementById('protocoloAtivo').checked;

        if (!alunoId || !nome || !objetivo) {
            alert('Preencha todos os campos obrigatórios!');
            return;
        }

        const protocoloData = {
            personal_id: currentUser.id,
            aluno_id: alunoId,
            nome: nome,
            objetivo: objetivo,
            objetivo_outros: objetivo === 'Outros' ? objetivoOutros : null,
            data_inicio: dataInicio || null,
            data_fim: dataFim || null,
            ativo: ativo
        };

        let result;
        if (id) {
            result = await supabase
                .from('fit_protocolos')
                .update(protocoloData)
                .eq('id', id);
        } else {
            result = await supabase
                .from('fit_protocolos')
                .insert(protocoloData)
                .select()
                .single();
        }

        if (result.error) throw result.error;

        alert('Protocolo salvo com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('protocoloModal')).hide();
        loadProtocolos();
    } catch (error) {
        console.error('Erro ao salvar protocolo:', error);
        alert('Erro ao salvar protocolo: ' + error.message);
    }
}

async function editProtocolo(id) {
    try {
        const { data: protocolo, error } = await supabase
            .from('fit_protocolos')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        document.getElementById('protocoloId').value = protocolo.id;
        document.getElementById('protocoloNome').value = protocolo.nome;
        document.getElementById('protocoloObjetivo').value = protocolo.objetivo;
        document.getElementById('protocoloObjetivoOutros').value = protocolo.objetivo_outros || '';
        document.getElementById('protocoloDataInicio').value = protocolo.data_inicio || '';
        document.getElementById('protocoloDataFim').value = protocolo.data_fim || '';
        document.getElementById('protocoloAtivo').checked = protocolo.ativo;
        
        await loadAlunosSelect('protocoloAluno');
        document.getElementById('protocoloAluno').value = protocolo.aluno_id;
        
        toggleObjetivoOutros();
        
        document.getElementById('protocoloModalTitle').textContent = 'Editar Protocolo';
        new bootstrap.Modal(document.getElementById('protocoloModal')).show();
    } catch (error) {
        console.error('Erro ao carregar protocolo:', error);
        alert('Erro ao carregar protocolo: ' + error.message);
    }
}

async function deleteProtocolo(id) {
    if (!confirm('Tem certeza que deseja excluir este protocolo? Todos os treinos vinculados serão removidos!')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('fit_protocolos')
            .delete()
            .eq('id', id);

        if (error) throw error;

        alert('Protocolo excluído com sucesso!');
        loadProtocolos();
    } catch (error) {
        console.error('Erro ao excluir protocolo:', error);
        alert('Erro ao excluir protocolo: ' + error.message);
    }
}

// FIM DO ARQUIVO
