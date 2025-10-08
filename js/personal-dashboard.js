let currentUser = null;
let currentAlunos = [];
let selectedAlunoId = null;
let currentAlunoDetailsId = null;

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
            
            // Fechar sidebar no mobile após seleção
            closeSidebar();
        });
    });
    
    // Toggle sidebar
    const sidebarCollapseBtn = document.getElementById('sidebarCollapse');
    if (sidebarCollapseBtn) {
        sidebarCollapseBtn.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.toggle('active');
            
            // Toggle overlay no mobile
            if (window.innerWidth <= 768) {
                if (sidebar.classList.contains('active')) {
                    overlay.style.display = 'block';
                    setTimeout(() => overlay.classList.add('active'), 10);
                } else {
                    overlay.classList.remove('active');
                    setTimeout(() => overlay.style.display = 'none', 300);
                }
            }
        });
    }
}

function showSection(sectionName) {
    console.log('Mostrando seção:', sectionName);
    
    // Esconde todas as seções
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Mostra a seção selecionada
    document.getElementById('section-' + sectionName).style.display = 'block';
    document.getElementById('currentSection').textContent = 
        sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
    
    // ✅ CARREGA OS DADOS ESPECÍFICOS DA SEÇÃO
    switch(sectionName) {
        case 'alunos':
            loadAlunos();
            break;
        case 'treinos':
            loadTreinosSection();
            break;
        case 'dietas':
            loadDietasSection();
            break;
        case 'medidas':
            loadMedidasSection();
            break;
        case 'agenda':
            loadAgendaSection();
            break;
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => overlay.style.display = 'none', 300);
    }
}

// Dashboard Data
async function loadDashboardData() {
    try {
        const { count: totalAlunos } = await supabase
            .from('fit_alunos')
            .select('*', { count: 'exact', head: true })
            .eq('personal_id', currentUser.id);

        document.getElementById('totalAlunos').textContent = totalAlunos || 0;

        const { count: alunosAtivos } = await supabase
            .from('fit_alunos')
            .select('*', { count: 'exact', head: true })
            .eq('personal_id', currentUser.id)
            .eq('ativo', true);

        document.getElementById('alunosAtivos').textContent = alunosAtivos || 0;

        const { count: totalTreinos } = await supabase
            .from('fit_treinos')
            .select('*', { count: 'exact', head: true })
            .eq('personal_id', currentUser.id);

        document.getElementById('totalTreinos').textContent = totalTreinos || 0;

        const today = new Date().toISOString().split('T')[0];
        const { count: consultasHoje } = await supabase
            .from('fit_agenda')
            .select('*', { count: 'exact', head: true })
            .eq('personal_id', currentUser.id)
            .gte('data_consulta', today + 'T00:00:00')
            .lte('data_consulta', today + 'T23:59:59');

        document.getElementById('consultasHoje').textContent = consultasHoje || 0;
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

// ALUNOS
async function loadAlunos() {
    try {
        const { data: alunos, error } = await supabase
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

        currentAlunos = alunos;
        renderAlunos(alunos);
    } catch (error) {
        console.error('Erro ao carregar alunos:', error);
    }
}

function renderAlunos(alunos) {
    const container = document.getElementById('alunosContainer');
    
    if (!alunos || alunos.length === 0) {
        container.innerHTML = '<div class="col-12"><div class="alert alert-info">Nenhum aluno cadastrado ainda.</div></div>';
        return;
    }

    container.innerHTML = '';

    alunos.forEach(aluno => {
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4';
        card.innerHTML = `
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title">${aluno.profile?.full_name || 'Sem nome'}</h5>
                    <p class="card-text">
                        <small class="text-muted">
                            <i class="bi bi-envelope"></i> ${aluno.profile?.email || 'Sem email'}<br>
                            ${aluno.profile?.phone ? `<i class="bi bi-telephone"></i> ${aluno.profile.phone}<br>` : ''}
                            <i class="bi bi-bullseye"></i> ${aluno.objetivo || 'Sem objetivo definido'}
                        </small>
                    </p>
                </div>
                <div class="card-footer bg-white">
                    <button class="btn btn-sm btn-outline-primary" onclick="showAlunoDetails('${aluno.id}')">
                        <i class="bi bi-eye"></i> Ver Detalhes
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="editAluno('${aluno.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteAluno('${aluno.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function filterAlunos() {
    const searchTerm = document.getElementById('searchAluno').value.toLowerCase();
    const filtered = currentAlunos.filter(aluno => {
        const nome = (aluno.profile?.full_name || '').toLowerCase();
        const email = (aluno.profile?.email || '').toLowerCase();
        const telefone = (aluno.profile?.phone || '').toLowerCase();
        return nome.includes(searchTerm) || email.includes(searchTerm) || telefone.includes(searchTerm);
    });
    
    renderAlunos(filtered);
    
    const resultText = document.getElementById('searchResults');
    if (searchTerm) {
        resultText.innerHTML = `<i class="bi bi-search"></i> ${filtered.length} resultado(s) encontrado(s)`;
    } else {
        resultText.innerHTML = '';
    }
}

function openAlunoModal(alunoId = null) {
    selectedAlunoId = alunoId;
    document.getElementById('alunoForm').reset();
    
    if (alunoId) {
        const aluno = currentAlunos.find(a => a.id === alunoId);
        if (aluno) {
            document.getElementById('alunoId').value = aluno.id;
            document.getElementById('alunoNome').value = aluno.profile?.full_name || '';
            document.getElementById('alunoEmail').value = aluno.profile?.email || '';
            document.getElementById('alunoTelefone').value = aluno.profile?.phone || '';
            document.getElementById('alunoDataNasc').value = aluno.data_nascimento || '';
            document.getElementById('alunoObjetivo').value = aluno.objetivo || '';
            document.getElementById('alunoObs').value = aluno.observacoes || '';
        }
    }
}

async function saveAluno() {
    try {
        const nome = document.getElementById('alunoNome').value;
        const email = document.getElementById('alunoEmail').value;
        const telefone = document.getElementById('alunoTelefone').value;
        const dataNasc = document.getElementById('alunoDataNasc').value;
        const senha = document.getElementById('alunoSenha').value;
        const objetivo = document.getElementById('alunoObjetivo').value;
        const observacoes = document.getElementById('alunoObs').value;

        if (!nome || !email || !senha) {
            alert('Preencha todos os campos obrigatórios!');
            return;
        }

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

        const { error: profileError } = await supabase
            .from('fit_profiles')
            .insert({
                id: authData.user.id,
                email: email,
                full_name: nome,
                phone: telefone || null,
                user_type: 'aluno'
            });

        if (profileError) throw profileError;

        const { error: alunoError } = await supabase
            .from('fit_alunos')
            .insert({
                profile_id: authData.user.id,
                personal_id: currentUser.id,
                data_nascimento: dataNasc || null,
                objetivo: objetivo || null,
                observacoes: observacoes || null,
                ativo: true
            });

        if (alunoError) throw alunoError;

        alert('Aluno cadastrado com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('alunoModal')).hide();
        loadAlunos();
        loadDashboardData();
    } catch (error) {
        console.error('Erro ao salvar aluno:', error);
        alert('Erro ao salvar aluno: ' + error.message);
    }
}

async function deleteAluno(alunoId) {
    if (!confirm('Tem certeza que deseja excluir este aluno?')) return;

    try {
        const { error } = await supabase
            .from('fit_alunos')
            .delete()
            .eq('id', alunoId);

        if (error) throw error;

        alert('Aluno excluído com sucesso!');
        loadAlunos();
        loadDashboardData();
    } catch (error) {
        console.error('Erro ao excluir aluno:', error);
        alert('Erro ao excluir aluno: ' + error.message);
    }
}

async function showAlunoDetails(alunoId) {
    try {
        currentAlunoDetailsId = alunoId;
        
        const { data: aluno, error } = await supabase
            .from('fit_alunos')
            .select(`
                *,
                profile:profile_id (
                    full_name,
                    email,
                    phone
                )
            `)
            .eq('id', alunoId)
            .single();

        if (error) throw error;

        document.getElementById('alunoDetailsName').textContent = aluno.profile?.full_name || 'Sem nome';
        document.getElementById('alunoDetailsEmail').textContent = aluno.profile?.email || 'Sem email';

        document.getElementById('alunoInfoContent').innerHTML = `
            <div class="row">
                <div class="col-md-6 mb-3">
                    <strong>Email:</strong><br>
                    ${aluno.profile?.email || 'Não informado'}
                </div>
                <div class="col-md-6 mb-3">
                    <strong>Telefone:</strong><br>
                    ${aluno.profile?.phone || 'Não informado'}
                </div>
                <div class="col-md-6 mb-3">
                    <strong>Data de Nascimento:</strong><br>
                    ${aluno.data_nascimento ? new Date(aluno.data_nascimento).toLocaleDateString('pt-BR') : 'Não informado'}
                </div>
                <div class="col-md-6 mb-3">
                    <strong>Objetivo:</strong><br>
                    ${aluno.objetivo || 'Não informado'}
                </div>
                <div class="col-12 mb-3">
                    <strong>Observações:</strong><br>
                    ${aluno.observacoes || 'Nenhuma observação'}
                </div>
            </div>
        `;

        new bootstrap.Modal(document.getElementById('alunoDetailsModal')).show();
    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        alert('Erro ao carregar detalhes do aluno');
    }
}

// Quick actions do modal de detalhes
function quickAddTreinoFromDetails() {
    const detailsModal = bootstrap.Modal.getInstance(document.getElementById('alunoDetailsModal'));
    if (detailsModal) detailsModal.hide();
    
    setTimeout(() => {
        const alunoSelect = document.getElementById('treinoAluno');
        if (alunoSelect && currentAlunoDetailsId) {
            alunoSelect.value = currentAlunoDetailsId;
        }
        openTreinoModal();
        new bootstrap.Modal(document.getElementById('treinoModal')).show();
    }, 300);
}

function quickAddDietaFromDetails() {
    const detailsModal = bootstrap.Modal.getInstance(document.getElementById('alunoDetailsModal'));
    if (detailsModal) detailsModal.hide();
    
    setTimeout(() => {
        const alunoSelect = document.getElementById('dietaAluno');
        if (alunoSelect && currentAlunoDetailsId) {
            alunoSelect.value = currentAlunoDetailsId;
        }
        openDietaModal();
        new bootstrap.Modal(document.getElementById('dietaModal')).show();
    }, 300);
}

function quickAddMedidaFromDetails() {
    const detailsModal = bootstrap.Modal.getInstance(document.getElementById('alunoDetailsModal'));
    if (detailsModal) detailsModal.hide();
    
    setTimeout(() => {
        const alunoSelect = document.getElementById('medidaAluno');
        if (alunoSelect && currentAlunoDetailsId) {
            alunoSelect.value = currentAlunoDetailsId;
        }
        openMedidaModal();
        new bootstrap.Modal(document.getElementById('medidaModal')).show();
    }, 300);
}

function quickAddAgendaFromDetails() {
    const detailsModal = bootstrap.Modal.getInstance(document.getElementById('alunoDetailsModal'));
    if (detailsModal) detailsModal.hide();
    
    setTimeout(() => {
        const alunoSelect = document.getElementById('agendaAluno');
        if (alunoSelect && currentAlunoDetailsId) {
            alunoSelect.value = currentAlunoDetailsId;
        }
        openAgendaModal();
        new bootstrap.Modal(document.getElementById('agendaModal')).show();
    }, 300);
}

// Carregar selects de alunos
function loadAlunoSelects() {
    const selects = ['treinoAluno', 'dietaAluno', 'medidaAluno', 'agendaAluno'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.addEventListener('focus', function() {
                if (this.options.length === 1) {
                    currentAlunos.forEach(aluno => {
                        const option = document.createElement('option');
                        option.value = aluno.id;
                        option.textContent = aluno.profile?.full_name || 'Sem nome';
                        this.appendChild(option);
                    });
                }
            });
        }
    });
}

// TREINOS
function openTreinoModal() {
    document.getElementById('treinoForm').reset();
    document.getElementById('exerciciosContainer').innerHTML = `
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
        </div>
    `;
}

function addExercicioField() {
    const container = document.getElementById('exerciciosContainer');
    const div = document.createElement('div');
    div.className = 'exercicio-item card mb-2 p-3';
    div.innerHTML = `
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
    `;
    container.appendChild(div);
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

        const { data: treino, error: treinoError } = await supabase
            .from('fit_treinos')
            .insert({
                personal_id: currentUser.id,
                aluno_id: alunoId,
                nome: nome,
                descricao: descricao || null
            })
            .select()
            .single();

        if (treinoError) throw treinoError;

        const exerciciosItems = document.querySelectorAll('.exercicio-item');
        
        for (let i = 0; i < exerciciosItems.length; i++) {
            const item = exerciciosItems[i];
            const exercicio = {
                treino_id: treino.id,
                nome: item.querySelector('.exercicio-nome').value,
                series: item.querySelector('.exercicio-series').value,
                repeticoes: item.querySelector('.exercicio-reps').value,
                descanso: item.querySelector('.exercicio-descanso').value || null,
                observacoes: item.querySelector('.exercicio-obs').value || null,
                ordem: i + 1
            };

            const { error: exError } = await supabase
                .from('fit_exercicios')
                .insert(exercicio);

            if (exError) throw exError;
        }

        alert('Treino criado com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('treinoModal')).hide();
    } catch (error) {
        console.error('Erro ao salvar treino:', error);
        alert('Erro ao salvar treino: ' + error.message);
    }
}

// DIETAS
function openDietaModal() {
    document.getElementById('dietaForm').reset();
    document.getElementById('refeicoesContainer').innerHTML = `
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
                    <textarea class="form-control refeicao-alimentos" rows="2" required placeholder="Ex: 2 ovos, 1 fatia de pão integral, 1 banana"></textarea>
                </div>
                <div class="col-12">
                    <label>Observações</label>
                    <textarea class="form-control refeicao-obs" rows="1" placeholder="Opções, substituições, etc."></textarea>
                </div>
            </div>
        </div>
    `;
}

function addRefeicaoField() {
    const container = document.getElementById('refeicoesContainer');
    const div = document.createElement('div');
    div.className = 'refeicao-item card mb-2 p-3';
    div.innerHTML = `
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
                <textarea class="form-control refeicao-alimentos" rows="2" required placeholder="Ex: 2 ovos, 1 fatia de pão integral, 1 banana"></textarea>
            </div>
            <div class="col-12">
                <label>Observações</label>
                <textarea class="form-control refeicao-obs" rows="1" placeholder="Opções, substituições, etc."></textarea>
            </div>
        </div>
    `;
    container.appendChild(div);
}

async function saveDieta() {
    try {
        const alunoId = document.getElementById('dietaAluno').value;
        const nome = document.getElementById('dietaNome').value;
        const descricao = document.getElementById('dietaDesc').value;
        const dataInicio = document.getElementById('dietaInicio').value;
        const dataFim = document.getElementById('dietaFim').value;

        if (!alunoId || !nome || !dataInicio) {
            alert('Preencha os campos obrigatórios!');
            return;
        }

        const { data: dieta, error: dietaError } = await supabase
            .from('fit_dietas')
            .insert({
                personal_id: currentUser.id,
                aluno_id: alunoId,
                nome: nome,
                descricao: descricao || null,
                data_inicio: dataInicio,
                data_fim: dataFim || null,
                ativa: true
            })
            .select()
            .single();

        if (dietaError) throw dietaError;

        const refeicoesItems = document.querySelectorAll('.refeicao-item');
        
        for (const item of refeicoesItems) {
            const refeicao = {
                dieta_id: dieta.id,
                tipo_refeicao: item.querySelector('.refeicao-tipo').value,
                horario: item.querySelector('.refeicao-horario').value || null,
                alimentos: item.querySelector('.refeicao-alimentos').value,
                observacoes: item.querySelector('.refeicao-obs').value || null
            };

            const { error: refError } = await supabase
                .from('fit_refeicoes')
                .insert(refeicao);

            if (refError) throw refError;
        }

        alert('Dieta criada com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('dietaModal')).hide();
    } catch (error) {
        console.error('Erro ao salvar dieta:', error);
        alert('Erro ao salvar dieta: ' + error.message);
    }
}

// MEDIDAS
function openMedidaModal() {
    document.getElementById('medidaForm').reset();
    document.getElementById('medidaData').valueAsDate = new Date();
}

async function saveMedida() {
    try {
        const medida = {
            aluno_id: document.getElementById('medidaAluno').value,
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
            observacoes: document.getElementById('medidaObs').value || null
        };

        if (!medida.aluno_id || !medida.data_medicao) {
            alert('Preencha os campos obrigatórios!');
            return;
        }

        const { error } = await supabase
            .from('fit_medidas')
            .insert(medida);

        if (error) throw error;

        alert('Medidas registradas com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('medidaModal')).hide();
    } catch (error) {
        console.error('Erro ao salvar medidas:', error);
        alert('Erro ao salvar medidas: ' + error.message);
    }
}

// AGENDA
function openAgendaModal() {
    document.getElementById('agendaForm').reset();
    document.getElementById('agendaId').value = '';
}

async function saveAgenda() {
    try {
        const agenda = {
            personal_id: currentUser.id,
            aluno_id: document.getElementById('agendaAluno').value,
            data_consulta: document.getElementById('agendaDataHora').value,
            tipo_consulta: document.getElementById('agendaTipo').value,
            status: document.getElementById('agendaStatus').value,
            observacoes: document.getElementById('agendaObs').value || null
        };

        if (!agenda.aluno_id || !agenda.data_consulta) {
            alert('Preencha os campos obrigatórios!');
            return;
        }

        const agendaId = document.getElementById('agendaId').value;

        if (agendaId) {
            const { error } = await supabase
                .from('fit_agenda')
                .update(agenda)
                .eq('id', agendaId);

            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('fit_agenda')
                .insert(agenda);

            if (error) throw error;
        }

        alert('Consulta agendada com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('agendaModal')).hide();
        loadDashboardData();
    } catch (error) {
        console.error('Erro ao salvar agenda:', error);
        alert('Erro ao salvar agenda: ' + error.message);
    }
}
// ========================================
// CARREGAR DADOS DAS SEÇÕES
// ========================================

// Carregar treinos na seção Treinos
async function loadTreinosSection() {
    try {
        const { data: treinos, error } = await supabase
            .from('fit_treinos')
            .select(`
                *,
                aluno:aluno_id (
                    id,
                    profile:profile_id (
                        full_name
                    )
                ),
                exercicios:fit_exercicios(*)
            `)
            .eq('personal_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        renderTreinosSection(treinos);
    } catch (error) {
        console.error('Erro ao carregar treinos:', error);
    }
}

function renderTreinosSection(treinos) {
    const container = document.getElementById('treinosList');
    
    if (!treinos || treinos.length === 0) {
        container.innerHTML = '<div class="alert alert-info"><i class="bi bi-info-circle"></i> Nenhum treino cadastrado ainda.</div>';
        return;
    }

    container.innerHTML = '';

    treinos.forEach(treino => {
        const card = document.createElement('div');
        card.className = 'card mb-3';
        card.innerHTML = `
            <div class="card-header d-flex justify-content-between align-items-center">
                <div>
                    <h5 class="mb-0">${treino.nome}</h5>
                    <small class="text-muted">Aluno: ${treino.aluno?.profile?.full_name || 'N/A'}</small>
                </div>
                <button class="btn btn-sm btn-danger" onclick="deleteTreino('${treino.id}')">
                    <i class="bi bi-trash"></i> Excluir
                </button>
            </div>
            <div class="card-body">
                ${treino.descricao ? `<p class="text-muted">${treino.descricao}</p>` : ''}
                <h6 class="mt-3">Exercícios (${treino.exercicios?.length || 0}):</h6>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Exercício</th>
                                <th>Séries</th>
                                <th>Repetições</th>
                                <th>Descanso</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${treino.exercicios?.map(ex => `
                                <tr>
                                    <td><strong>${ex.nome}</strong></td>
                                    <td>${ex.series}</td>
                                    <td>${ex.repeticoes}</td>
                                    <td>${ex.descanso || '-'}</td>
                                </tr>
                            `).join('') || '<tr><td colspan="4" class="text-center">Nenhum exercício</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

async function deleteTreino(treinoId) {
    if (!confirm('Tem certeza que deseja excluir este treino?')) return;

    try {
        const { error } = await supabase
            .from('fit_treinos')
            .delete()
            .eq('id', treinoId);

        if (error) throw error;

        alert('Treino excluído com sucesso!');
        loadTreinosSection();
    } catch (error) {
        console.error('Erro ao excluir treino:', error);
        alert('Erro ao excluir treino: ' + error.message);
    }
}

// Carregar dietas na seção Dietas
async function loadDietasSection() {
    try {
        const { data: dietas, error } = await supabase
            .from('fit_dietas')
            .select(`
                *,
                aluno:aluno_id (
                    id,
                    profile:profile_id (
                        full_name
                    )
                ),
                refeicoes:fit_refeicoes(*)
            `)
            .eq('personal_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        renderDietasSection(dietas);
    } catch (error) {
        console.error('Erro ao carregar dietas:', error);
    }
}

function renderDietasSection(dietas) {
    const container = document.getElementById('dietasList');
    
    if (!dietas || dietas.length === 0) {
        container.innerHTML = '<div class="alert alert-info"><i class="bi bi-info-circle"></i> Nenhuma dieta cadastrada ainda.</div>';
        return;
    }

    container.innerHTML = '';

    dietas.forEach(dieta => {
        const card = document.createElement('div');
        card.className = 'card mb-3';
        card.innerHTML = `
            <div class="card-header d-flex justify-content-between align-items-center">
                <div>
                    <h5 class="mb-0">${dieta.nome}</h5>
                    <small class="text-muted">Aluno: ${dieta.aluno?.profile?.full_name || 'N/A'}</small>
                </div>
                <div>
                    <span class="badge bg-${dieta.ativa ? 'success' : 'secondary'} me-2">
                        ${dieta.ativa ? 'Ativa' : 'Inativa'}
                    </span>
                    <button class="btn btn-sm btn-danger" onclick="deleteDieta('${dieta.id}')">
                        <i class="bi bi-trash"></i> Excluir
                    </button>
                </div>
            </div>
            <div class="card-body">
                ${dieta.descricao ? `<p class="text-muted">${dieta.descricao}</p>` : ''}
                <p class="mb-2">
                    <strong>Período:</strong> 
                    ${new Date(dieta.data_inicio).toLocaleDateString('pt-BR')} 
                    ${dieta.data_fim ? ` até ${new Date(dieta.data_fim).toLocaleDateString('pt-BR')}` : ''}
                </p>
                <h6 class="mt-3">Refeições (${dieta.refeicoes?.length || 0}):</h6>
                <div class="row">
                    ${dieta.refeicoes?.map(ref => `
                        <div class="col-md-6 mb-2">
                            <div class="card bg-light">
                                <div class="card-body p-2">
                                    <strong>${ref.tipo_refeicao}</strong> ${ref.horario ? `- ${ref.horario}` : ''}<br>
                                    <small class="text-muted">${ref.alimentos}</small>
                                </div>
                            </div>
                        </div>
                    `).join('') || '<div class="col-12 text-center text-muted">Nenhuma refeição cadastrada</div>'}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

async function deleteDieta(dietaId) {
    if (!confirm('Tem certeza que deseja excluir esta dieta?')) return;

    try {
        const { error } = await supabase
            .from('fit_dietas')
            .delete()
            .eq('id', dietaId);

        if (error) throw error;

        alert('Dieta excluída com sucesso!');
        loadDietasSection();
    } catch (error) {
        console.error('Erro ao excluir dieta:', error);
        alert('Erro ao excluir dieta: ' + error.message);
    }
}

// Carregar medidas na seção Medidas
async function loadMedidasSection() {
    try {
        const { data: alunos, error } = await supabase
            .from('fit_alunos')
            .select('id, profile:profile_id(full_name)')
            .eq('personal_id', currentUser.id);

        if (error) throw error;

        const select = document.getElementById('alunoMedidasSelect');
        select.innerHTML = '<option value="">Selecione um aluno...</option>';
        
        alunos.forEach(aluno => {
            const option = document.createElement('option');
            option.value = aluno.id;
            option.textContent = aluno.profile?.full_name || 'Sem nome';
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar alunos para medidas:', error);
    }
}

async function loadMedidas() {
    const alunoId = document.getElementById('alunoMedidasSelect').value;
    
    if (!alunoId) {
        document.getElementById('medidasContent').innerHTML = '<div class="alert alert-info">Selecione um aluno para ver as medidas</div>';
        return;
    }

    try {
        const { data: medidas, error } = await supabase
            .from('fit_medidas')
            .select('*')
            .eq('aluno_id', alunoId)
            .order('data_medicao', { ascending: false });

        if (error) throw error;

        if (!medidas || medidas.length === 0) {
            document.getElementById('medidasContent').innerHTML = '<div class="alert alert-info">Nenhuma medida registrada para este aluno</div>';
            return;
        }

        renderMedidasTable(medidas);
    } catch (error) {
        console.error('Erro ao carregar medidas:', error);
    }
}

function renderMedidasTable(medidas) {
    const container = document.getElementById('medidasContent');
    
    container.innerHTML = `
        <div class="card">
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Peso</th>
                                <th>Altura</th>
                                <th>% Gordura</th>
                                <th>Cintura</th>
                                <th>Quadril</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${medidas.map(m => `
                                <tr>
                                    <td>${new Date(m.data_medicao).toLocaleDateString('pt-BR')}</td>
                                    <td>${m.peso ? m.peso + ' kg' : '-'}</td>
                                    <td>${m.altura ? m.altura + ' cm' : '-'}</td>
                                    <td>${m.percentual_gordura ? m.percentual_gordura + '%' : '-'}</td>
                                    <td>${m.cintura ? m.cintura + ' cm' : '-'}</td>
                                    <td>${m.quadril ? m.quadril + ' cm' : '-'}</td>
                                    <td>
                                        <button class="btn btn-sm btn-danger" onclick="deleteMedida('${m.id}')">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

async function deleteMedida(medidaId) {
    if (!confirm('Tem certeza que deseja excluir esta medida?')) return;

    try {
        const { error } = await supabase
            .from('fit_medidas')
            .delete()
            .eq('id', medidaId);

        if (error) throw error;

        alert('Medida excluída com sucesso!');
        loadMedidas();
    } catch (error) {
        console.error('Erro ao excluir medida:', error);
        alert('Erro ao excluir medida: ' + error.message);
    }
}

// Carregar agenda na seção Agenda
async function loadAgendaSection() {
    try {
        const { data: consultas, error } = await supabase
            .from('fit_agenda')
            .select(`
                *,
                aluno:aluno_id (
                    id,
                    profile:profile_id (
                        full_name
                    )
                )
            `)
            .eq('personal_id', currentUser.id)
            .order('data_consulta', { ascending: true });

        if (error) throw error;

        renderAgendaSection(consultas);
    } catch (error) {
        console.error('Erro ao carregar agenda:', error);
    }
}

function renderAgendaSection(consultas) {
    const container = document.getElementById('agendaCalendar');
    
    if (!consultas || consultas.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nenhuma consulta agendada</div>';
        return;
    }

    container.innerHTML = '<div class="list-group">';

    consultas.forEach(consulta => {
        const data = new Date(consulta.data_consulta);
        const isPast = data < new Date();
        
        container.innerHTML += `
            <div class="list-group-item ${isPast ? 'bg-light' : ''}">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${consulta.aluno?.profile?.full_name || 'Sem nome'}</h6>
                        <p class="mb-1">
                            <i class="bi bi-calendar"></i> ${data.toLocaleDateString('pt-BR')} às 
                            ${data.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                        </p>
                        <p class="mb-1"><strong>${consulta.tipo_consulta}</strong></p>
                        ${consulta.observacoes ? `<p class="mb-0 text-muted small">${consulta.observacoes}</p>` : ''}
                    </div>
                    <div>
                        <span class="badge bg-${isPast ? 'secondary' : consulta.status === 'confirmada' ? 'success' : 'warning'}">
                            ${isPast ? 'Realizada' : consulta.status}
                        </span>
                        <button class="btn btn-sm btn-danger ms-2" onclick="deleteAgenda('${consulta.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML += '</div>';
}

async function deleteAgenda(agendaId) {
    if (!confirm('Tem certeza que deseja excluir esta consulta?')) return;

    try {
        const { error } = await supabase
            .from('fit_agenda')
            .delete()
            .eq('id', agendaId);

        if (error) throw error;

        alert('Consulta excluída com sucesso!');
        loadAgendaSection();
        loadDashboardData();
    } catch (error) {
        console.error('Erro ao excluir consulta:', error);
        alert('Erro ao excluir consulta: ' + error.message);
    }
}

// ============================================
// VARIÁVEIS GLOBAIS PARA PROTOCOLOS
// ============================================
let currentProtocoloId = null;
let currentTreinoTemp = null;
let exerciciosTempList = [];
let currentExercicioVideoUrl = null;

// ============================================
// FUNÇÕES DE PROTOCOLOS
// ============================================

// Carregar lista de protocolos
async function loadProtocolos() {
    try {
        const alunoFiltro = document.getElementById('filtroAlunoProtocolos').value;
        const statusFiltro = document.getElementById('filtroStatusProtocolos').value;

        let query = supabase
            .from('fit_protocolos')
            .select(`
                *,
                aluno:fit_alunos(nome, email)
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

// Renderizar lista de protocolos
function renderProtocolos(protocolos) {
    const container = document.getElementById('protocolosList');

    if (!protocolos || protocolos.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nenhum protocolo cadastrado ainda.</div>';
        return;
    }

    container.innerHTML = '';

    protocolos.forEach(protocolo => {
        const dataInicio = protocolo.data_inicio ? new Date(protocolo.data_inicio).toLocaleDateString('pt-BR') : '-';
        const dataFim = protocolo.data_fim ? new Date(protocolo.data_fim).toLocaleDateString('pt-BR') : '-';
        
        const card = document.createElement('div');
        card.className = 'card mb-3';
        card.innerHTML = `
            <div class="card-header d-flex justify-content-between align-items-center">
                <div>
                    <h5 class="mb-0">${protocolo.nome}</h5>
                    <small class="text-muted">${protocolo.aluno?.nome || 'Aluno não encontrado'}</small>
                </div>
                <div>
                    <span class="badge bg-${protocolo.ativo ? 'success' : 'secondary'} me-2">
                        ${protocolo.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    <button class="btn btn-sm btn-primary" onclick="openGerenciarTreinosModal('${protocolo.id}', '${protocolo.nome}')">
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

// Abrir modal de novo protocolo
async function openNovoProtocoloModal() {
    document.getElementById('protocoloForm').reset();
    document.getElementById('protocoloId').value = '';
    document.getElementById('protocoloModalTitle').textContent = 'Novo Protocolo';
    document.getElementById('protocoloAtivo').checked = true;
    document.getElementById('objetivoOutrosDiv').style.display = 'none';
    
    // Setar data de início como hoje
    document.getElementById('protocoloDataInicio').valueAsDate = new Date();
    
    // Carregar alunos
    await loadAlunosSelect('protocoloAluno');
    
    new bootstrap.Modal(document.getElementById('protocoloModal')).show();
}

// Toggle campo "Outros" no objetivo
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

// Salvar protocolo
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
            // Atualizar
            result = await supabase
                .from('fit_protocolos')
                .update(protocoloData)
                .eq('id', id);
        } else {
            // Inserir
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

// Editar protocolo
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

// Deletar protocolo
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

// Abrir modal de gerenciar treinos
async function openGerenciarTreinosModal(protocoloId, protocoloNome) {
    currentProtocoloId = protocoloId;
    document.getElementById('currentProtocoloId').value = protocoloId;
    document.getElementById('gerenciarTreinosTitle').textContent = 'Gerenciar Treinos';
    document.getElementById('gerenciarTreinosSubtitle').textContent = `Protocolo: ${protocoloNome}`;
    
    await loadTreinosProtocolo(protocoloId);
    
    new bootstrap.Modal(document.getElementById('gerenciarTreinosModal')).show();
}

// Carregar treinos do protocolo
async function loadTreinosProtocolo(protocoloId) {
    try {
        const { data: treinos, error } = await supabase
            .from('fit_treinos')
            .select(`
                *,
                exercicios:fit_exercicios(count)
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

// Renderizar treinos do protocolo
function renderTreinosProtocolo(treinos) {
    const container = document.getElementById('treinosProtocoloList');

    if (!treinos || treinos.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nenhum treino adicionado ainda. Clique em "Adicionar Treino" para começar.</div>';
        return;
    }

    container.innerHTML = '';

    treinos.forEach((treino, index) => {
        const card = document.createElement('div');
        card.className = 'card mb-3';
        card.innerHTML = `
            <div class="card-header d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-0">${treino.nome}</h6>
                    ${treino.descricao ? `<small class="text-muted">${treino.descricao}</small>` : ''}
                </div>
                <div>
                    <span class="badge bg-info me-2">${treino.exercicios?.[0]?.count || 0} exercícios</span>
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

// Abrir modal de adicionar treino
function openAdicionarTreinoModal() {
    document.getElementById('treinoForm').reset();
    document.getElementById('treinoProtocoloId').value = currentProtocoloId;
    exerciciosTempList = [];
    renderExerciciosTempList();
    
    new bootstrap.Modal(document.getElementById('adicionarTreinoModal')).show();
}

// Salvar treino
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

        // Buscar aluno_id do protocolo
        const { data: protocolo } = await supabase
            .from('fit_protocolos')
            .select('aluno_id')
            .eq('id', protocoloId)
            .single();

        // Salvar treino
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

        // Salvar exercícios
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

// Deletar treino
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

// Abrir modal de adicionar exercício
async function openAdicionarExercicioModal() {
    document.getElementById('exercicioForm').reset();
    document.getElementById('seriesDetalhesContainer').innerHTML = '';
    document.getElementById('exercicioPreview').style.display = 'none';
    document.getElementById('dicaCounter').textContent = '0';
    currentExercicioVideoUrl = null;
    
    // Carregar grupos musculares
    await loadGruposMusculares();
    
    // Gerar 4 séries por padrão
    document.getElementById('exercicioNumSeries').value = 4;
    gerarLinhasSeries();
    
    new bootstrap.Modal(document.getElementById('adicionarExercicioModal')).show();
}

// Carregar grupos musculares
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

// Carregar exercícios da biblioteca por grupo
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

// Carregar detalhes do exercício selecionado
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

// Alterar vídeo do exercício
function alterarVideoExercicio() {
    document.getElementById('exercicioVideoUpload').click();
}

// Upload de vídeo customizado
async function uploadVideoExercicio() {
    try {
        const fileInput = document.getElementById('exercicioVideoUpload');
        const file = fileInput.files[0];
        
        if (!file) return;

        // Validar tipo de arquivo
        if (!file.type.startsWith('video/')) {
            alert('Por favor, selecione um arquivo de vídeo válido!');
            return;
        }

        // Upload para Supabase Storage
        const fileName = `exercicio_${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
            .from('videos-exercicios')
            .upload(fileName, file);

        if (error) throw error;

        // Obter URL pública
        const { data: urlData } = supabase.storage
            .from('videos-exercicios')
            .getPublicUrl(fileName);

        currentExercicioVideoUrl = urlData.publicUrl;

        // Atualizar preview
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

// Gerar linhas dinâmicas de séries
function gerarLinhasSeries() {
    const numSeries = parseInt(document.getElementById('exercicioNumSeries').value) || 1;
    const container = document.getElementById('seriesDetalhesContainer');
    
    container.innerHTML = '';

    for (let i = 1; i <= numSeries; i++) {
        adicionarLinhaSerie(i);
    }
}

// Adicionar uma linha de série
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

// Adicionar série extra
function adicionarSerie() {
    const container = document.getElementById('seriesDetalhesContainer');
    const numSeries = container.querySelectorAll('.serie-row').length + 1;
    adicionarLinhaSerie(numSeries);
}

// Remover série
function removerSerie(button) {
    button.closest('.serie-row').remove();
}

// Contar caracteres da dica
document.addEventListener('DOMContentLoaded', () => {
    const dicaTextarea = document.getElementById('exercicioDica');
    if (dicaTextarea) {
        dicaTextarea.addEventListener('input', () => {
            document.getElementById('dicaCounter').textContent = dicaTextarea.value.length;
        });
    }
});

// Salvar exercício
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

        // Obter nome do exercício
        const select = document.getElementById('exercicioBiblioteca');
        const nomeExercicio = select.options[select.selectedIndex].textContent;

        // Obter nome do grupo muscular
        const selectGrupo = document.getElementById('exercicioGrupoMuscular');
        const nomeGrupo = selectGrupo.options[selectGrupo.selectedIndex].textContent;

        // Coletar detalhes das séries
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

        // Criar objeto de exercício
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

        // Adicionar à lista temporária
        exerciciosTempList.push(exercicio);

        // Se marcou para usar como padrão, atualizar na biblioteca
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

// Renderizar lista temporária de exercícios
function renderExerciciosTempList() {
    const container = document.getElementById('exerciciosTreinoList');

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

// Remover exercício da lista temporária
function removerExercicioTemp(index) {
    exerciciosTempList.splice(index, 1);
    renderExerciciosTempList();
}

// ============================================
// INICIALIZAÇÃO DA SEÇÃO DE PROTOCOLOS
// ============================================

// Adicionar no setupNavigation() existente
const originalSetupNavigation = setupNavigation;
setupNavigation = function() {
    originalSetupNavigation();
    
    // Adicionar listener para seção de protocolos
    const protocolosLink = document.querySelector('[data-section="protocolos"]');
    if (protocolosLink) {
        protocolosLink.addEventListener('click', async () => {
            await loadAlunosSelect('filtroAlunoProtocolos');
            loadProtocolos();
        });
    }
};
