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
            <div class="card-header d-flex justify-content-between align-items-center">
                <div>
                    <h5 class="mb-0">${protocolo.nome}</h5>
                    <small class="text-muted">${nomeAluno}</small>
                </div>
                <div>
                    <span class="badge bg-${protocolo.ativo ? 'success' : 'secondary'} me-2">
                        ${protocolo.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    <button class="btn btn-sm btn-primary" onclick="openGerenciarTreinosModal('${protocolo.id}', '${protocolo.nome.replace(/'/g, "\\'")}')">
                        <i class="bi bi-list-ul"></i> Gerenciar Treinos
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="editProtocolo('${protocolo.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProtocolo('${protocolo.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-3">
                        <strong>Objetivo:</strong><br>
                        ${protocolo.objetivo}
                        ${protocolo.objetivo_outros ? `<br><small class="text-muted">${protocolo.objetivo_outros}</small>` : ''}
                    </div>
                    <div class="col-md-3">
                        <strong>Início:</strong><br>
                        ${dataInicio}
                    </div>
                    <div class="col-md-3">
                        <strong>Término Previsto:</strong><br>
                        ${dataFim}
                    </div>
                    <div class="col-md-3">
                        <strong>Criado em:</strong><br>
                        ${new Date(protocolo.created_at).toLocaleDateString('pt-BR')}
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

async function openNovoProtocoloModal() {
    document.getElementById('protocoloForm').reset();
    document.getElementById('protocoloId').value = '';
    document.getElementById('protocoloModalTitle').textContent = 'Novo Protocolo';
    document.getElementById('protocoloAtivo').checked = true;
    document.getElementById('objetivoOutrosDiv').style.display = 'none';
    
    document.getElementById('protocoloDataInicio').valueAsDate = new Date();
    
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

// ============================================
// FUNÇÕES DE TREINOS DO PROTOCOLO
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
                    <h6 class="mb-0">${treino.nome}</h6>
                    ${treino.descricao ? `<small class="text-muted">${treino.descricao}</small>` : ''}
                </div>
                <div>
                    <span class="badge bg-info me-2">${numExercicios} exercícios</span>
                    <button class="btn btn-sm btn-primary" onclick="editTreino('${treino.id}')">
                        <i class="bi bi-pencil"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTreino('${treino.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

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

        if (!nome) {
            alert('Informe o nome do treino!');
            return;
        }

        if (exerciciosTempList.length === 0) {
            alert('Adicione pelo menos um exercício ao treino!');
            return;
        }

        const { data: protocolo } = await supabase
            .from('fit_protocolos')
            .select('aluno_id')
            .eq('id', protocoloId)
            .single();

        const { data: treino, error: treinoError } = await supabase
            .from('fit_treinos')
            .insert({
                protocolo_id: protocoloId,
                aluno_id: protocolo.aluno_id,
                personal_id: currentUser.id,
                nome: nome,
                descricao: descricao
            })
            .select()
            .single();

        if (treinoError) throw treinoError;

        for (let i = 0; i < exerciciosTempList.length; i++) {
            const ex = exerciciosTempList[i];
            ex.treino_id = treino.id;
            ex.protocolo_id = protocoloId;
            ex.ordem = i + 1;

            const { error: exError } = await supabase
                .from('fit_exercicios')
                .insert(ex);

            if (exError) throw exError;
        }

        alert('Treino salvo com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('adicionarTreinoModal')).hide();
        loadTreinosProtocolo(protocoloId);
    } catch (error) {
        console.error('Erro ao salvar treino:', error);
        alert('Erro ao salvar treino: ' + error.message);
    }
}

function editTreino(id) {
    console.log('Editar treino:', id);
}

async function deleteTreino(id) {
    if (!confirm('Tem certeza que deseja excluir este treino?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('fit_treinos')
            .delete()
            .eq('id', id);

        if (error) throw error;

        alert('Treino excluído com sucesso!');
        loadTreinosProtocolo(currentProtocoloId);
    } catch (error) {
        console.error('Erro ao excluir treino:', error);
        alert('Erro ao excluir treino: ' + error.message);
    }
}

// ============================================
// FUNÇÕES DE EXERCÍCIOS
// ============================================

async function openAdicionarExercicioModal() {
    document.getElementById('exercicioForm').reset();
    document.getElementById('seriesDetalhesContainer').innerHTML = '';
    document.getElementById('exercicioPreview').style.display = 'none';
    document.getElementById('dicaCounter').textContent = '0';
    currentExercicioVideoUrl = null;
    
    await loadGruposMusculares();
    
    document.getElementById('exercicioNumSeries').value = 4;
    gerarLinhasSeries();
    
    new bootstrap.Modal(document.getElementById('adicionarExercicioModal')).show();
}

async function loadGruposMusculares() {
    try {
        const { data: grupos, error } = await supabase
            .from('fit_grupos_musculares')
            .select('*')
            .order('nome', { ascending: true });

        if (error) throw error;

        const select = document.getElementById('exercicioGrupoMuscular');
        select.innerHTML = '<option value="">Selecione o grupo...</option>';

        grupos.forEach(grupo => {
            const option = document.createElement('option');
            option.value = grupo.id;
            option.textContent = grupo.nome;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar grupos musculares:', error);
    }
}

async function loadExerciciosBiblioteca() {
    try {
        const grupoId = document.getElementById('exercicioGrupoMuscular').value;
        
        if (!grupoId) {
            document.getElementById('exercicioBiblioteca').innerHTML = '<option value="">Selecione o exercício...</option>';
            return;
        }

        const { data: exercicios, error } = await supabase
            .from('fit_exercicios_biblioteca')
            .select('*')
            .eq('grupo_muscular_id', grupoId)
            .order('nome', { ascending: true });

        if (error) throw error;

        const select = document.getElementById('exercicioBiblioteca');
        select.innerHTML = '<option value="">Selecione o exercício...</option>';

        exercicios.forEach(ex => {
            const option = document.createElement('option');
            option.value = ex.id;
            option.textContent = ex.nome;
            option.dataset.videoUrl = ex.video_url || '';
            option.dataset.imagemUrl = ex.imagem_url || '';
            option.dataset.descricao = ex.descricao || '';
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar exercícios:', error);
    }
}

function loadExercicioDetalhes() {
    const select = document.getElementById('exercicioBiblioteca');
    const selectedOption = select.options[select.selectedIndex];
    
    if (!selectedOption || !selectedOption.value) {
        document.getElementById('exercicioPreview').style.display = 'none';
        return;
    }

    const videoUrl = selectedOption.dataset.videoUrl;
    const imagemUrl = selectedOption.dataset.imagemUrl;
    currentExercicioVideoUrl = videoUrl;

    document.getElementById('exercicioPreview').style.display = 'block';

    if (videoUrl) {
        document.getElementById('exercicioVideo').style.display = 'block';
        document.getElementById('exercicioVideoSource').src = videoUrl;
        document.getElementById('exercicioVideo').load();
        document.getElementById('exercicioImagem').style.display = 'none';
    } else if (imagemUrl) {
        document.getElementById('exercicioImagem').style.display = 'block';
        document.getElementById('exercicioImagem').src = imagemUrl;
        document.getElementById('exercicioVideo').style.display = 'none';
    } else {
        document.getElementById('exercicioPreview').style.display = 'none';
    }
}

function alterarVideoExercicio() {
    document.getElementById('exercicioVideoUpload').click();
}

async function uploadVideoExercicio() {
    try {
        const fileInput = document.getElementById('exercicioVideoUpload');
        const file = fileInput.files[0];
        
        if (!file) return;

        if (!file.type.startsWith('video/')) {
            alert('Por favor, selecione um arquivo de vídeo válido!');
            return;
        }

        const fileName = `exercicio_${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
            .from('videos-exercicios')
            .upload(fileName, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
            .from('videos-exercicios')
            .getPublicUrl(fileName);

        currentExercicioVideoUrl = urlData.publicUrl;

        document.getElementById('exercicioVideoSource').src = currentExercicioVideoUrl;
        document.getElementById('exercicioVideo').load();
        document.getElementById('exercicioVideo').style.display = 'block';
        document.getElementById('exercicioImagem').style.display = 'none';

        alert('Vídeo enviado com sucesso!');
    } catch (error) {
        console.error('Erro ao fazer upload do vídeo:', error);
        alert('Erro ao enviar vídeo: ' + error.message);
    }
}

function gerarLinhasSeries() {
    const numSeries = parseInt(document.getElementById('exercicioNumSeries').value) || 1;
    const container = document.getElementById('seriesDetalhesContainer');
    
    container.innerHTML = '';

    for (let i = 1; i <= numSeries; i++) {
        adicionarLinhaSerie(i);
    }
}

function adicionarLinhaSerie(numero) {
    const container = document.getElementById('seriesDetalhesContainer');
    
    const row = document.createElement('div');
    row.className = 'row mb-3 align-items-end serie-row';
    row.dataset.serie = numero;
    row.innerHTML = `
        <div class="col-md-2">
            <label class="form-label">Unidade de medida</label>
            <select class="form-select serie-unidade">
                <option value="">Selecione uma opção</option>
                <option value="Repetições" selected>Repetições</option>
                <option value="Tempo">Tempo</option>
                <option value="Distância">Distância</option>
            </select>
        </div>
        <div class="col-md-2">
            <label class="form-label">Número de repetições</label>
            <input type="number" class="form-control serie-numero" placeholder="Ex: 12">
        </div>
        <div class="col-md-2">
            <label class="form-label">Carga / Intensidade</label>
            <input type="text" class="form-control serie-carga" placeholder="Ex: 20kg">
        </div>
        <div class="col-md-2">
            <label class="form-label">Velocidade de execução</label>
            <select class="form-select serie-velocidade">
                <option value="">Selecione uma opção</option>
                <option value="Lenta">Lenta</option>
                <option value="Moderada" selected>Moderada</option>
                <option value="Rápida">Rápida</option>
                <option value="Explosiva">Explosiva</option>
                <option value="Controlada">Controlada</option>
            </select>
        </div>
        <div class="col-md-1">
            <label class="form-label">Pausa mín (s)</label>
            <input type="number" class="form-control serie-pausa-min" placeholder="60">
        </div>
        <div class="col-md-1">
            <label class="form-label">Pausa máx (s)</label>
            <input type="number" class="form-control serie-pausa-max" placeholder="90">
        </div>
        <div class="col-md-2">
            <button type="button" class="btn btn-danger w-100" onclick="removerSerie(this)">
                <i class="bi bi-x"></i>
            </button>
        </div>
    `;
    
    container.appendChild(row);
}

function adicionarSerie() {
    const container = document.getElementById('seriesDetalhesContainer');
    const numSeries = container.querySelectorAll('.serie-row').length + 1;
    adicionarLinhaSerie(numSeries);
}

function removerSerie(button) {
    button.closest('.serie-row').remove();
}

async function saveExercicio() {
    try {
        const grupoMuscularId = document.getElementById('exercicioGrupoMuscular').value;
        const exercicioBibliotecaId = document.getElementById('exercicioBiblioteca').value;
        const numSeries = document.getElementById('exercicioNumSeries').value;
        const metodo = document.getElementById('exercicioMetodo').value;
        const objetivo = document.getElementById('exercicioObjetivo').value;
        const dica = document.getElementById('exercicioDica').value;
        const dicaPadrao = document.getElementById('exercicioDicaPadrao').checked;

        if (!grupoMuscularId || !exercicioBibliotecaId) {
            alert('Selecione o grupo muscular e o exercício!');
            return;
        }

        const select = document.getElementById('exercicioBiblioteca');
        const nomeExercicio = select.options[select.selectedIndex].textContent;

        const selectGrupo = document.getElementById('exercicioGrupoMuscular');
        const nomeGrupo = selectGrupo.options[selectGrupo.selectedIndex].textContent;

        const seriesRows = document.querySelectorAll('.serie-row');
        const seriesDetalhes = [];

        seriesRows.forEach((row, index) => {
            seriesDetalhes.push({
                serie: index + 1,
                unidade_medida: row.querySelector('.serie-unidade').value,
                numero: row.querySelector('.serie-numero').value,
                carga: row.querySelector('.serie-carga').value,
                velocidade: row.querySelector('.serie-velocidade').value,
                pausa_min: row.querySelector('.serie-pausa-min').value,
                pausa_max: row.querySelector('.serie-pausa-max').value
            });
        });

        const exercicio = {
            exercicio_biblioteca_id: exercicioBibliotecaId,
            nome: nomeExercicio,
            grupo_muscular: nomeGrupo,
            numero_series: parseInt(numSeries),
            metodo: metodo,
            objetivo_exercicio: objetivo,
            series_detalhes: seriesDetalhes,
            dica: dica,
            video_url: currentExercicioVideoUrl
        };

        exerciciosTempList.push(exercicio);

        if (dicaPadrao && dica) {
            await supabase
                .from('fit_exercicios_biblioteca')
                .update({ descricao: dica })
                .eq('id', exercicioBibliotecaId);
        }

        alert('Exercício adicionado ao treino!');
        bootstrap.Modal.getInstance(document.getElementById('adicionarExercicioModal')).hide();
        renderExerciciosTempList();
    } catch (error) {
        console.error('Erro ao adicionar exercício:', error);
        alert('Erro ao adicionar exercício: ' + error.message);
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

    exerciciosTempList.forEach((ex, index) => {
        const card = document.createElement('div');
        card.className = 'card mb-2';
        card.innerHTML = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${index + 1}. ${ex.nome}</strong>
                        <br>
                        <small class="text-muted">
                            ${ex.grupo_muscular} | ${ex.numero_series} séries
                            ${ex.metodo ? ` | ${ex.metodo}` : ''}
                        </small>
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="removerExercicioTemp(${index})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function removerExercicioTemp(index) {
    exerciciosTempList.splice(index, 1);
    renderExerciciosTempList();
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

        if (error) throw error;

        const select = document.getElementById(selectId);
        if (!select) return;

        while (select.options.length > 1) {
            select.remove(1);
        }

        alunos.forEach(aluno => {
            const option = document.createElement('option');
            option.value = aluno.id;
            option.textContent = aluno.nome || aluno.profile?.full_name || 'Sem nome';
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar alunos no select:', error);
    }
}

// ============================================
// INICIALIZAÇÃO AUTOMÁTICA DE CONTADORES
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const dicaTextarea = document.getElementById('exercicioDica');
    if (dicaTextarea) {
        dicaTextarea.addEventListener('input', function() {
            const counter = document.getElementById('dicaCounter');
            if (counter) {
                counter.textContent = this.value.length;
            }
        });
    }
});
