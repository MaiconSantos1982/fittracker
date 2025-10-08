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
// DIETAS - COM TABELA FIT_REFEICOES
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
                ),
                refeicoes:fit_refeicoes(count)
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
        const numRefeicoes = dieta.refeicoes?.[0]?.count || 0;
        
        const card = document.createElement('div');
        card.className = 'card mb-3';
        card.innerHTML = `
            <div class="card-header">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="flex-grow-1" style="cursor: pointer;" 
                         data-bs-toggle="collapse" 
                         data-bs-target="#dieta-${dieta.id}">
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi bi-chevron-right collapse-icon-dieta" style="transition: transform 0.2s;"></i>
                            <div>
                                <h5 class="mb-0">${dieta.nome}</h5>
                                <small class="text-muted">${nomeAluno} • ${numRefeicoes} refeições</small>
                            </div>
                        </div>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-success" onclick="openAdicionarRefeicaoModal('${dieta.id}')">
                            <i class="bi bi-plus-circle"></i> Adicionar Refeição
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="editDieta('${dieta.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteDietaConfirm('${dieta.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="collapse" id="dieta-${dieta.id}">
                <div class="card-body bg-light">
                    <div id="refeicoes-dieta-${dieta.id}">
                        <div class="text-center py-3">
                            <div class="spinner-border spinner-border-sm"></div>
                            <span class="ms-2">Carregando refeições...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);

        const collapseElement = document.getElementById(`dieta-${dieta.id}`);
        let refeicoesCarregadas = false;

        collapseElement.addEventListener('show.bs.collapse', async () => {
            if (!refeicoesCarregadas) {
                await loadRefeicoesDieta(dieta.id);
                refeicoesCarregadas = true;
            }
            const icon = collapseElement.previousElementSibling.querySelector('.collapse-icon-dieta');
            icon.style.transform = 'rotate(90deg)';
        });

        collapseElement.addEventListener('hide.bs.collapse', () => {
            const icon = collapseElement.previousElementSibling.querySelector('.collapse-icon-dieta');
            icon.style.transform = 'rotate(0deg)';
        });
    });
}

async function loadRefeicoesDieta(dietaId) {
    try {
        const { data: refeicoes, error } = await supabase
            .from('fit_refeicoes')
            .select('*')
            .eq('dieta_id', dietaId)
            .order('horario', { ascending: true });

        if (error) throw error;
        renderRefeicoesDieta(dietaId, refeicoes);
    } catch (error) {
        console.error('Erro ao carregar refeições:', error);
        document.getElementById(`refeicoes-dieta-${dietaId}`).innerHTML = 
            '<div class="alert alert-danger">Erro ao carregar refeições: ' + error.message + '</div>';
    }
}

function renderRefeicoesDieta(dietaId, refeicoes) {
    const container = document.getElementById(`refeicoes-dieta-${dietaId}`);
    if (!container) return;

    if (!refeicoes || refeicoes.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nenhuma refeição. Clique em "Adicionar Refeição".</div>';
        return;
    }

    let html = '';
    refeicoes.forEach((refeicao, index) => {
        // ✅ PARSE DO CAMPO ALIMENTOS
        let alimentos = [];
        try {
            if (typeof refeicao.alimentos === 'string') {
                alimentos = JSON.parse(refeicao.alimentos);
            } else if (Array.isArray(refeicao.alimentos)) {
                alimentos = refeicao.alimentos;
            }
        } catch (e) {
            console.error('Erro ao fazer parse de alimentos:', e);
        }

        html += `
            <div class="card mb-2 shadow-sm">
                <div class="card-header bg-white">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${index + 1}. ${refeicao.tipo_refeicao || 'Refeição'}</strong>
                            ${refeicao.horario ? `<small class="text-muted ms-2">(${refeicao.horario})</small>` : ''}
                        </div>
                        <div>
                            <button class="btn btn-sm btn-warning" onclick="editRefeicao('${refeicao.id}', '${dietaId}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteRefeicao('${refeicao.id}', '${dietaId}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    ${refeicao.observacoes ? `<p class="mb-2"><small><strong>Obs:</strong> ${refeicao.observacoes}</small></p>` : ''}
                    ${alimentos && alimentos.length > 0 ? `
                        <div class="table-responsive">
                            <table class="table table-sm mb-0">
                                <thead><tr><th>Alimento</th><th>Quantidade</th><th>Observação</th></tr></thead>
                                <tbody>
                                    ${alimentos.map(alimento => `
                                        <tr>
                                            <td>${alimento.nome}</td>
                                            <td>${alimento.quantidade || '-'}</td>
                                            <td>${alimento.observacao || '-'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<small class="text-muted">Nenhum alimento adicionado</small>'}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ============================================
// FUNÇÕES DE REFEIÇÕES
// ============================================

async function openAdicionarRefeicaoModal(dietaId) {
    window.currentDietaId = dietaId;
    delete window.editingRefeicaoId;
    document.getElementById('refeicaoForm').reset();
    document.getElementById('refeicaoOutroDiv').style.display = 'none';
    document.getElementById('alimentosList').innerHTML = '<div class="alert alert-info">Clique em "Adicionar Alimento" para começar</div>';
    window.alimentosTemp = [];
    new bootstrap.Modal(document.getElementById('adicionarRefeicaoModal')).show();
}

function toggleRefeicaoOutro() {
    const tipo = document.getElementById('refeicaoTipo').value;
    const outroDiv = document.getElementById('refeicaoOutroDiv');
    
    if (tipo === 'Outro') {
        outroDiv.style.display = 'block';
        document.getElementById('refeicaoOutro').required = true;
    } else {
        outroDiv.style.display = 'none';
        document.getElementById('refeicaoOutro').required = false;
    }
}

function adicionarLinhaAlimento() {
    window.alimentosTemp = window.alimentosTemp || [];
    
    const index = window.alimentosTemp.length;
    const container = document.getElementById('alimentosList');
    
    if (window.alimentosTemp.length === 0) {
        container.innerHTML = '';
    }
    
    const row = document.createElement('div');
    row.className = 'row mb-2 align-items-end alimento-row';
    row.dataset.index = index;
    row.innerHTML = `
        <div class="col-md-4">
            <label class="form-label">Alimento</label>
            <input type="text" class="form-control alimento-nome" placeholder="Ex: Aveia em flocos">
        </div>
        <div class="col-md-3">
            <label class="form-label">Quantidade</label>
            <input type="text" class="form-control alimento-quantidade" placeholder="Ex: 50g, 1 xícara">
        </div>
        <div class="col-md-4">
            <label class="form-label">Observação (opcional)</label>
            <input type="text" class="form-control alimento-observacao" placeholder="Ex: Com banana">
        </div>
        <div class="col-md-1">
            <button type="button" class="btn btn-danger w-100" onclick="removerLinhaAlimento(this)">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `;
    
    container.appendChild(row);
    
    // Adicionar placeholder no array
    window.alimentosTemp.push({ nome: '', quantidade: '', observacao: '' });
}

function removerLinhaAlimento(button) {
    const row = button.closest('.alimento-row');
    const index = parseInt(row.dataset.index);
    
    row.remove();
    
    // Remover do array
    window.alimentosTemp.splice(index, 1);
    
    // Reindexar as linhas restantes
    document.querySelectorAll('.alimento-row').forEach((row, newIndex) => {
        row.dataset.index = newIndex;
    
    });
    
    // Se não houver mais alimentos, mostrar mensagem
    if (window.alimentosTemp.length === 0) {
        document.getElementById('alimentosList').innerHTML = '<div class="alert alert-info">Clique em "Adicionar Alimento" para começar</div>';
    }
}

function coletarAlimentosDosInputs() {
    const alimentos = [];
    document.querySelectorAll('.alimento-row').forEach(row => {
        const nome = row.querySelector('.alimento-nome').value.trim();
        const quantidade = row.querySelector('.alimento-quantidade').value.trim();
        const observacao = row.querySelector('.alimento-observacao').value.trim();
        
        if (nome) {
            alimentos.push({ nome, quantidade, observacao });
        }
    });
    return alimentos;
}

async function saveRefeicao() {
    try {
        const tipoSelectElement = document.getElementById('refeicaoTipo');  // ✅ CORRETO!
        const tipoOutroElement = document.getElementById('refeicaoOutro');
        
        if (!tipoSelectElement) {
            console.error('Elemento refeicaoTipo não encontrado');
            alert('Erro: Campo "Tipo de Refeição" não encontrado no formulário.');
            return;
        }
        
        const tipoSelect = tipoSelectElement.value;
        const tipoOutro = tipoOutroElement ? tipoOutroElement.value : '';
        const tipoRefeicao = tipoSelect === 'Outro' ? tipoOutro : tipoSelect;
        const horario = document.getElementById('refeicaoHorario')?.value || '';
        const observacoes = document.getElementById('refeicaoDescricao')?.value || '';

        if (!tipoRefeicao) return alert('Selecione o tipo de refeição!');

        const alimentos = coletarAlimentosDosInputs();

        const refeicaoData = {
            dieta_id: window.currentDietaId,
            tipo_refeicao: tipoRefeicao,
            horario: horario || null,
            alimentos: alimentos,
            observacoes: observacoes || null
        };

        if (window.editingRefeicaoId) {
            const { error } = await supabase
                .from('fit_refeicoes')
                .update(refeicaoData)
                .eq('id', window.editingRefeicaoId);

            if (error) throw error;
            delete window.editingRefeicaoId;
        } else {
            const { error } = await supabase
                .from('fit_refeicoes')
                .insert(refeicaoData);

            if (error) throw error;
        }

        alert('Refeição salva!');
        bootstrap.Modal.getInstance(document.getElementById('adicionarRefeicaoModal')).hide();
        await loadRefeicoesDieta(window.currentDietaId);
        await loadDietas();
    } catch (error) {
        console.error('Erro completo:', error);
        alert('Erro: ' + error.message);
    }
}

async function editRefeicao(refeicaoId, dietaId) {
    try {
        const { data: refeicao, error } = await supabase
            .from('fit_refeicoes')
            .select('*')
            .eq('id', refeicaoId)
            .single();

        if (error) throw error;

        window.currentDietaId = dietaId;
        window.editingRefeicaoId = refeicaoId;

        // Preencher tipo de refeição
        const tiposPreDefinidos = ['Café da manhã', 'Lanche da manhã', 'Almoço', 'Lanche da tarde', 'Jantar', 'Ceia'];
        
        const tipoSelect = document.getElementById('refeicaoTipo');  // ✅ CORRETO
        const refeicaoOutroDiv = document.getElementById('refeicaoOutroDiv');
        const refeicaoOutroInput = document.getElementById('refeicaoOutro');
        
        if (tiposPreDefinidos.includes(refeicao.tipo_refeicao)) {
            tipoSelect.value = refeicao.tipo_refeicao;
            refeicaoOutroDiv.style.display = 'none';
            refeicaoOutroInput.value = '';
        } else {
            tipoSelect.value = 'Outro';
            refeicaoOutroDiv.style.display = 'block';
            refeicaoOutroInput.value = refeicao.tipo_refeicao;
        }

        document.getElementById('refeicaoHorario').value = refeicao.horario || '';
        document.getElementById('refeicaoDescricao').value = refeicao.observacoes || '';
        
        // Parse e renderização dos alimentos...
        // (resto do código)
    }
}

function adicionarAlimento() {
    const nome = prompt('Nome do alimento:');
    if (!nome) return;
    const quantidade = prompt('Quantidade (ex: 100g, 1 xícara):');
    const observacao = prompt('Observação (opcional):');

    window.alimentosTemp = window.alimentosTemp || [];
    window.alimentosTemp.push({ nome, quantidade, observacao });
    renderAlimentosTemp();
}

function renderAlimentosTemp() {
    const container = document.getElementById('alimentosList');
    if (!window.alimentosTemp || window.alimentosTemp.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nenhum alimento</div>';
        return;
    }

    let html = '<table class="table table-sm"><thead><tr><th>Alimento</th><th>Qtd</th><th>Ações</th></tr></thead><tbody>';
    window.alimentosTemp.forEach((alimento, i) => {
        html += `<tr>
            <td>${alimento.nome}</td>
            <td>${alimento.quantidade || '-'}</td>
            <td><button class="btn btn-sm btn-danger" onclick="removerAlimento(${i})"><i class="bi bi-trash"></i></button></td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function removerAlimento(index) {
    window.alimentosTemp.splice(index, 1);
    renderAlimentosTemp();
}


async function deleteRefeicao(refeicaoId, dietaId) {
    if (!confirm('Excluir esta refeição?')) return;
    
    try {
        const { error } = await supabase
            .from('fit_refeicoes')
            .delete()
            .eq('id', refeicaoId);

        if (error) throw error;

        alert('Refeição excluída!');
        await loadRefeicoesDieta(dietaId);
        await loadDietas();
    } catch (error) {
        alert('Erro: ' + error.message);
    }
}

async function editDieta(dietaId) {
    try {
        const { data: dieta, error } = await supabase
            .from('fit_dietas')
            .select('*')
            .eq('id', dietaId)
            .single();

        if (error) throw error;

        await loadAlunosSelect('dietaAluno');
        document.getElementById('dietaAluno').value = dieta.aluno_id;
        document.getElementById('dietaNome').value = dieta.nome;
        window.editingDietaId = dietaId;

        new bootstrap.Modal(document.getElementById('criarDietaModal')).show();
    } catch (error) {
        alert('Erro: ' + error.message);
    }
}

async function deleteDietaConfirm(dietaId) {
    if (!confirm('Excluir esta dieta e todas as refeições?')) return;
    try {
        const { error } = await supabase.from('fit_dietas').delete().eq('id', dietaId);
        if (error) throw error;
        alert('Dieta excluída!');
        loadDietas();
    } catch (error) {
        alert('Erro: ' + error.message);
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

// ============================================
// PROTOCOLOS - MODAL GERENCIAR TREINOS
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
            .select('*, exercicios_count:fit_exercicios(count)')
            .eq('protocolo_id', protocoloId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        renderTreinosProtocolo(treinos);
    } catch (error) {
        console.error('Erro ao carregar treinos:', error);
    }
}

function renderTreinosProtocolo(treinos) {
    const container = document.getElementById('treinosProtocoloList');
    if (!container) return;
    if (!treinos || treinos.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nenhum treino. Clique em "Adicionar Treino".</div>';
        return;
    }
    container.innerHTML = '';
    treinos.forEach(treino => {
        const numEx = treino.exercicios_count?.[0]?.count || 0;
        const card = document.createElement('div');
        card.className = 'card mb-3';
        card.innerHTML = `
            <div class="card-header d-flex justify-content-between align-items-center">
                <div><h6 class="mb-0"><button class="btn btn-link p-0" data-bs-toggle="collapse" data-bs-target="#tm-${treino.id}">
                    <i class="bi bi-chevron-right"></i> ${treino.nome}</button></h6>
                    ${treino.descricao ? `<small class="text-muted">${treino.descricao}</small>` : ''}</div>
                <div><span class="badge bg-info">${numEx} ex</span>
                    <button class="btn btn-sm btn-warning" onclick="event.stopPropagation(); editTreinoProtocolo('${treino.id}')"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteTreinoConfirm('${treino.id}')"><i class="bi bi-trash"></i></button>
                </div>
            </div>
            <div class="collapse" id="tm-${treino.id}">
                <div class="card-body"><div id="exercicios-treino-${treino.id}">Carregando...</div></div>
            </div>`;
        container.appendChild(card);
        document.getElementById(`tm-${treino.id}`).addEventListener('show.bs.collapse', () => loadExerciciosTreino(treino.id));
    });
}

async function loadExerciciosTreino(treinoId) {
    try {
        const { data: exercicios, error } = await supabase.from('fit_exercicios').select('*').eq('treino_id', treinoId).order('ordem');
        if (error) throw error;
        const modalOpen = document.getElementById('gerenciarTreinosModal')?.classList.contains('show');
        if (modalOpen) renderExerciciosModal(treinoId, exercicios);
        else renderExerciciosTreino(treinoId, exercicios);
    } catch (error) {
        console.error(error);
    }
}

function renderExerciciosModal(treinoId, exercicios) {
    const container = document.getElementById(`exercicios-treino-${treinoId}`);
    if (!container) return;
    if (!exercicios?.length) {
        container.innerHTML = '<div class="alert alert-info">Nenhum exercício.</div>';
        return;
    }
    let html = '<table class="table table-sm"><thead><tr><th>#</th><th>Exercício</th><th>Grupo</th><th>Séries</th><th>Ações</th></tr></thead><tbody>';
    exercicios.forEach((ex, i) => {
        const series = ex.series_detalhes?.length > 0 ? `${ex.series_detalhes.length}x${ex.series_detalhes[0].numero}` : `${ex.numero_series || '-'}`;
        html += `<tr><td>${i+1}</td><td><strong>${ex.nome}</strong></td><td><span class="badge bg-secondary">${ex.grupo_muscular || '-'}</span></td><td>${series}</td><td>
            <button class="btn btn-sm btn-warning" onclick="editExercicioModal('${ex.id}', '${treinoId}')"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-danger" onclick="deleteExercicioModal('${ex.id}', '${treinoId}')"><i class="bi bi-trash"></i></button>
        </td></tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function renderExerciciosTreino(treinoId, exercicios) {
    const container = document.getElementById(`exercicios-treino-${treinoId}`);
    if (!container) return;
    if (!exercicios?.length) {
        container.innerHTML = '<div class="alert alert-info">Nenhum exercício.</div>';
        return;
    }
    let html = '<div class="exercise-list">';
    exercicios.forEach((ex, i) => {
        const series = ex.series_detalhes?.length > 0 ? `${ex.series_detalhes.length}x${ex.series_detalhes[0].numero}` : `${ex.numero_series}`;
        html += `<div class="exercise-item">
            <div class="exercise-number">${i+1}</div>
            <div class="exercise-content">
                <h6 class="exercise-name">${ex.nome}</h6>
                <div class="exercise-meta">
                    <span class="badge bg-secondary">${ex.grupo_muscular || '-'}</span>
                    <span class="text-muted">${series} séries</span>
                </div>
                ${ex.dica ? `<div class="exercise-tip"><i class="bi bi-lightbulb-fill text-warning"></i><small>${ex.dica}</small></div>` : ''}
            </div>
            <div class="exercise-actions">
                <button class="btn-icon" onclick="editExercicio('${ex.id}', '${treinoId}')"><i class="bi bi-pencil"></i></button>
                <button class="btn-icon btn-icon-danger" onclick="deleteExercicio('${ex.id}', '${treinoId}')"><i class="bi bi-trash"></i></button>
            </div>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

async function editExercicioModal(exercicioId, treinoId) {
    bootstrap.Modal.getInstance(document.getElementById('gerenciarTreinosModal'))?.hide();
    setTimeout(() => editExercicio(exercicioId, treinoId), 300);
}

async function deleteExercicioModal(exercicioId, treinoId) {
    if (!confirm('Excluir exercício?')) return;
    try {
        await supabase.from('fit_exercicios').delete().eq('id', exercicioId);
        alert('Excluído!');
        await loadExerciciosTreino(treinoId);
        await loadTreinosProtocolo(currentProtocoloId);
    } catch (error) {
        alert('Erro: ' + error.message);
    }
}

async function deleteExercicio(exercicioId, treinoId) {
    if (!confirm('Excluir exercício?')) return;
    try {
        await supabase.from('fit_exercicios').delete().eq('id', exercicioId);
        alert('Excluído!');
        await loadExerciciosTreino(treinoId);
    } catch (error) {
        alert('Erro: ' + error.message);
    }
}

async function deleteTreinoConfirm(treinoId) {
    if (!confirm('Excluir treino?')) return;
    try {
        const { data: treino } = await supabase.from('fit_treinos').select('protocolo_id').eq('id', treinoId).single();
        await supabase.from('fit_treinos').delete().eq('id', treinoId);
        alert('Excluído!');
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
        if (!nome) return alert('Nome obrigatório!');
        if (!exerciciosTempList.length) return alert('Adicione exercícios!');

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

        alert('Salvo!');
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
    if (!exerciciosTempList.length) {
        container.innerHTML = '<div class="alert alert-info">Nenhum exercício</div>';
        return;
    }
    container.innerHTML = '';
    exerciciosTempList.forEach((ex, i) => {
        const card = document.createElement('div');
        card.className = 'card mb-2';
        card.innerHTML = `<div class="card-body d-flex justify-content-between">
            <div><strong>${i+1}. ${ex.nome}</strong><br><small>${ex.grupo_muscular} | ${ex.numero_series} séries</small></div>
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
// ADICIONAR/EDITAR EXERCÍCIO
// ============================================

async function openAdicionarExercicioModal() {
    document.getElementById('exercicioForm').reset();
    document.getElementById('seriesDetalhesContainer').innerHTML = '';
    await loadGruposMusculares();
    document.getElementById('exercicioNumSeries').value = 4;
    gerarLinhasSeries();
    delete window.editingExercicioId;
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

function removerSerie(btn) {
    btn.closest('.serie-row').remove();
}

async function saveExercicio() {
    const grupoId = document.getElementById('exercicioGrupoMuscular').value;
    const exId = document.getElementById('exercicioBiblioteca').value;
    if (!grupoId || !exId) return alert('Selecione grupo e exercício!');

    const select = document.getElementById('exercicioBiblioteca');
    const nomeEx = select.options[select.selectedIndex].text;
    const selectGrupo = document.getElementById('exercicioGrupoMuscular');
    const nomeGrupo = selectGrupo.options[selectGrupo.selectedIndex].text;

    const seriesRows = document.querySelectorAll('.serie-row');
    const seriesDetalhes = [];
    seriesRows.forEach((row, i) => {
        seriesDetalhes.push({
            serie: i + 1,
            unidade_medida: row.querySelector('.serie-unidade').value,
            numero: row.querySelector('.serie-numero').value,
            carga: row.querySelector('.serie-carga').value,
            velocidade: row.querySelector('.serie-velocidade').value,
            pausa_min: row.querySelector('.serie-pausa-min').value,
            pausa_max: row.querySelector('.serie-pausa-max').value
        });
    });

    const exercicio = {
        exercicio_biblioteca_id: exId,
        nome: nomeEx,
        grupo_muscular: nomeGrupo,
        numero_series: seriesRows.length,
        metodo: document.getElementById('exercicioMetodo').value,
        objetivo_exercicio: document.getElementById('exercicioObjetivo').value,
        dica: document.getElementById('exercicioDica').value,
        series_detalhes: seriesDetalhes
    };

    if (window.editingExercicioId) {
        await supabase.from('fit_exercicios').update(exercicio).eq('id', window.editingExercicioId);
        const { data: ex } = await supabase.from('fit_exercicios').select('treino_id').eq('id', window.editingExercicioId).single();
        delete window.editingExercicioId;
        alert('Atualizado!');
        bootstrap.Modal.getInstance(document.getElementById('adicionarExercicioModal')).hide();
        if (ex) await loadExerciciosTreino(ex.treino_id);
    } else {
        exerciciosTempList.push(exercicio);
        alert('Adicionado!');
        bootstrap.Modal.getInstance(document.getElementById('adicionarExercicioModal')).hide();
        renderExerciciosTempList();
    }
}

async function editExercicio(exercicioId, treinoId) {
    try {
        const { data: ex } = await supabase.from('fit_exercicios').select('*').eq('id', exercicioId).single();
        window.editingExercicioId = exercicioId;

        const { data: grupos } = await supabase.from('fit_grupos_musculares').select('*').ilike('nome', ex.grupo_muscular);
        const grupoId = grupos?.[0]?.id;

        document.getElementById('exercicioNumSeries').value = ex.numero_series || 4;
        document.getElementById('exercicioMetodo').value = ex.metodo || '';
        document.getElementById('exercicioObjetivo').value = ex.objetivo_exercicio || '';
        document.getElementById('exercicioDica').value = ex.dica || '';

        await loadGruposMusculares();
        if (grupoId) {
            document.getElementById('exercicioGrupoMuscular').value = grupoId;
            await loadExerciciosBiblioteca();
        }
        if (ex.exercicio_biblioteca_id) {
            document.getElementById('exercicioBiblioteca').value = ex.exercicio_biblioteca_id;
        }

        const container = document.getElementById('seriesDetalhesContainer');
        container.innerHTML = '';
        ex.series_detalhes?.forEach((serie, i) => {
            const row = document.createElement('div');
            row.className = 'row mb-2 serie-row';
            row.innerHTML = `
                <div class="col-md-2"><select class="form-select serie-unidade"><option ${serie.unidade_medida === 'Repetições' ? 'selected' : ''}>Repetições</option><option ${serie.unidade_medida === 'Tempo' ? 'selected' : ''}>Tempo</option></select></div>
                <div class="col-md-2"><input type="number" class="form-control serie-numero" value="${serie.numero || ''}"></div>
                <div class="col-md-2"><input type="text" class="form-control serie-carga" value="${serie.carga || ''}"></div>
                <div class="col-md-2"><select class="form-select serie-velocidade"><option ${serie.velocidade === 'Moderada' ? 'selected' : ''}>Moderada</option><option ${serie.velocidade === 'Lenta' ? 'selected' : ''}>Lenta</option><option ${serie.velocidade === 'Rápida' ? 'selected' : ''}>Rápida</option></select></div>
                <div class="col-md-1"><input type="number" class="form-control serie-pausa-min" value="${serie.pausa_min || ''}"></div>
                <div class="col-md-1"><input type="number" class="form-control serie-pausa-max" value="${serie.pausa_max || ''}"></div>
                <div class="col-md-2"><button class="btn btn-danger w-100" onclick="removerSerie(this)"><i class="bi bi-x"></i></button></div>
            `;
            container.appendChild(row);
        });

        new bootstrap.Modal(document.getElementById('adicionarExercicioModal')).show();
    } catch (error) {
        alert('Erro: ' + error.message);
    }
}

async function loadAlunosSelect(selectId) {
    try {
        const { data: alunos } = await supabase.from('fit_alunos').select('id, profile:profile_id(full_name)').eq('personal_id', currentUser.id).eq('ativo', true);
        const select = document.getElementById(selectId);
        if (!select) return;
        while (select.options.length > 1) select.remove(1);
        alunos?.forEach(aluno => {
            const option = document.createElement('option');
            option.value = aluno.id;
            option.textContent = aluno.profile?.full_name || 'Sem nome';
            select.appendChild(option);
        });
    } catch (error) {
        console.error(error);
    }
}
// ============================================
// MEDIDAS E AGENDA
// ============================================

async function openRegistrarMedidasModal() {
    document.getElementById('medidasForm').reset();
    await loadAlunosSelect('alunoMedidasSelect');
    new bootstrap.Modal(document.getElementById('registrarMedidasModal')).show();
}

async function saveMedidas() {
    try {
        const alunoId = document.getElementById('alunoMedidasSelect').value;
        if (!alunoId) return alert('Selecione um aluno!');

        const medidas = {
            personal_id: currentUser.id,
            aluno_id: alunoId,
            peso: document.getElementById('medidaPeso').value,
            altura: document.getElementById('medidaAltura').value,
            imc: document.getElementById('medidaIMC').value,
            pescoco: document.getElementById('medidaPescoco').value,
            ombro: document.getElementById('medidaOmbro').value,
            torax: document.getElementById('medidaTorax').value,
            cintura: document.getElementById('medidaCintura').value,
            abdomen: document.getElementById('medidaAbdomen').value,
            quadril: document.getElementById('medidaQuadril').value,
            braco_direito: document.getElementById('medidaBracoDireito').value,
            braco_esquerdo: document.getElementById('medidaBracoEsquerdo').value,
            antebraco_direito: document.getElementById('medidaAntebracoDireito').value,
            antebraco_esquerdo: document.getElementById('medidaAntebracoEsquerdo').value,
            coxa_direita: document.getElementById('medidaCoxaDireita').value,
            coxa_esquerda: document.getElementById('medidaCoxaEsquerda').value,
            panturrilha_direita: document.getElementById('medidaPanturrilhaDireita').value,
            panturrilha_esquerda: document.getElementById('medidaPanturrilhaEsquerda').value,
            observacoes: document.getElementById('medidaObs').value
        };

        const { error } = await supabase.from('fit_medidas').insert(medidas);
        if (error) throw error;

        alert('Medidas registradas com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('registrarMedidasModal')).hide();
    } catch (error) {
        console.error('Erro ao salvar medidas:', error);
        alert('Erro ao salvar medidas: ' + error.message);
    }
}

async function openNovaConsultaModal() {
    document.getElementById('agendaForm').reset();
    await loadAlunosSelect('agendaAluno');
    const today = new Date().toISOString().slice(0, 16);
    document.getElementById('agendaData').value = today;
    new bootstrap.Modal(document.getElementById('novaConsultaModal')).show();
}

async function saveConsulta() {
    try {
        const alunoId = document.getElementById('agendaAluno').value;
        const dataConsulta = document.getElementById('agendaData').value;
        const observacoes = document.getElementById('agendaObs').value;

        if (!alunoId || !dataConsulta) {
            return alert('Preencha aluno e data!');
        }

        const { error } = await supabase.from('fit_agenda').insert({
            personal_id: currentUser.id,
            aluno_id: alunoId,
            data_consulta: dataConsulta,
            observacoes: observacoes
        });

        if (error) throw error;

        alert('Consulta agendada!');
        bootstrap.Modal.getInstance(document.getElementById('novaConsultaModal')).hide();
        loadAgenda();
    } catch (error) {
        console.error('Erro ao salvar consulta:', error);
        alert('Erro ao salvar consulta: ' + error.message);
    }
}
