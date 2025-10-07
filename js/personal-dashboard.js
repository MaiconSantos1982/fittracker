let currentUser = null;
let currentAlunos = [];
let selectedAlunoId = null;

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
            if (window.innerWidth <= 768 && overlay) {
                overlay.classList.toggle('active');
            }
        });
    }
}

function showSection(sectionName) {
    console.log('Mudando para seção:', sectionName);
    
    // Esconder todas as seções
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Mostrar seção selecionada
    const targetSection = document.getElementById('section-' + sectionName);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // Atualizar título
    const titles = {
        'dashboard': 'Dashboard',
        'alunos': 'Alunos',
        'treinos': 'Treinos',
        'dietas': 'Dietas',
        'medidas': 'Medidas',
        'agenda': 'Agenda',
        'notificacoes': 'Notificações'
    };
    
    document.getElementById('currentSection').textContent = titles[sectionName] || sectionName;
    
    // Carregar dados específicos da seção
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

// Dashboard Data
async function loadDashboardData() {
    try {
        console.log('Carregando dados do dashboard...');
        
        // Total de alunos
        const { data: alunos, error: alunosError } = await supabase
            .from('fit_alunos')
            .select('*', { count: 'exact' })
            .eq('personal_id', currentUser.id);

        if (!alunosError && alunos) {
            document.getElementById('totalAlunos').textContent = alunos.length;
            document.getElementById('alunosAtivos').textContent = alunos.filter(a => a.ativo).length;
            console.log('Total de alunos:', alunos.length);
        }

        // Total de treinos
        const { data: treinos } = await supabase
            .from('fit_treinos')
            .select('*', { count: 'exact' })
            .eq('personal_id', currentUser.id);

        if (treinos) {
            document.getElementById('totalTreinos').textContent = treinos.length;
            console.log('Total de treinos:', treinos.length);
        }

// Consultas hoje
const today = new Date();
const todayStr = today.toISOString().split('T')[0]; // "2025-10-07"
const startStr = todayStr + ' 00:00:00';
const endStr = todayStr + ' 23:59:59';

console.log('Buscando consultas entre:', startStr, 'e', endStr);

const { data: consultas } = await supabase
    .from('fit_agenda')
    .select('*', { count: 'exact' })
    .eq('personal_id', currentUser.id)
    .gte('data_consulta', startStr)
    .lte('data_consulta', endStr);

if (consultas) {
    document.getElementById('consultasHoje').textContent = consultas.length;
    console.log('Consultas hoje:', consultas.length);
}

    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

// ========================================
// CRUD ALUNOS
// ========================================

async function loadAlunos() {
    try {
        console.log('Carregando alunos...');
        console.log('Personal ID:', currentUser.id);
        
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

        if (error) {
            console.error('Erro ao carregar alunos:', error);
            throw error;
        }

        console.log('Alunos carregados:', data);
        
        data?.forEach(aluno => {
            console.log('Aluno:', {
                id: aluno.id,
                profile_id: aluno.profile_id,
                profile: aluno.profile,
                nome: aluno.profile?.full_name
            });
        });

        currentAlunos = data || [];
        renderAlunosTable(currentAlunos);
    } catch (error) {
        console.error('Erro ao carregar alunos:', error);
        alert('Erro ao carregar alunos: ' + error.message);
    }
}

function renderAlunosTable(alunos) {
    const container = document.getElementById('alunosContainer');
    
    if (!container) {
        console.error('Container alunosContainer não encontrado');
        return;
    }
    
    if (!alunos || alunos.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info text-center">
                    <i class="bi bi-people" style="font-size: 48px; opacity: 0.3;"></i>
                    <p class="mt-2 mb-0">Nenhum aluno cadastrado ainda</p>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    alunos.forEach(aluno => {
        const nomeAluno = aluno.profile?.full_name || 'Nome não disponível';
        const emailAluno = aluno.profile?.email || 'Email não disponível';
        const telefoneAluno = aluno.profile?.phone || '-';
        
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        col.innerHTML = `
            <div class="card h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h5 class="mb-1">${nomeAluno}</h5>
                            <small class="text-muted">${emailAluno}</small>
                        </div>
                        <span class="badge ${aluno.ativo ? 'bg-success' : 'bg-secondary'}">
                            ${aluno.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                    </div>
                    
                    ${telefoneAluno !== '-' ? `
                        <p class="mb-2">
                            <i class="bi bi-telephone"></i> ${telefoneAluno}
                        </p>
                    ` : ''}
                    
                    ${aluno.objetivo ? `
                        <p class="mb-2 text-muted small">
                            <i class="bi bi-bullseye"></i> ${aluno.objetivo}
                        </p>
                    ` : ''}
                    
                    <hr>
                    
                    <div class="d-grid gap-2">
                        <button class="btn btn-sm btn-primary" onclick="showAlunoDetails('${aluno.id}')">
                            <i class="bi bi-eye"></i> Ver Detalhes
                        </button>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="quickAddTreino('${aluno.id}')" title="Adicionar Treino">
                                <i class="bi bi-lightning"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="quickAddDieta('${aluno.id}')" title="Adicionar Dieta">
                                <i class="bi bi-egg-fried"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-info" onclick="quickAddMedida('${aluno.id}')" title="Registrar Medidas">
                                <i class="bi bi-rulers"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-warning" onclick="quickAddAgenda('${aluno.id}')" title="Agendar Consulta">
                                <i class="bi bi-calendar"></i>
                            </button>
                        </div>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteAluno('${aluno.id}')">
                            <i class="bi bi-trash"></i> Excluir
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(col);
    });
}

function openAlunoModal(alunoId = null) {
    document.getElementById('alunoForm').reset();
    document.getElementById('alunoId').value = '';
    
    document.getElementById('alunoSenha').removeAttribute('required');
    
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
            
            document.getElementById('alunoSenha').removeAttribute('required');
            document.querySelector('#alunoModal .modal-title').textContent = 'Editar Aluno';
        }
    } else {
        document.getElementById('alunoSenha').setAttribute('required', 'required');
        document.querySelector('#alunoModal .modal-title').textContent = 'Cadastrar Aluno';
    }
}

function editAluno(alunoId) {
    openAlunoModal(alunoId);
    const modal = new bootstrap.Modal(document.getElementById('alunoModal'));
    modal.show();
}

async function saveAluno() {
    try {
        const nome = document.getElementById('alunoNome').value.trim();
        const email = document.getElementById('alunoEmail').value.trim().toLowerCase();
        const telefone = document.getElementById('alunoTelefone').value.trim();
        const senha = document.getElementById('alunoSenha').value;
        const dataNasc = document.getElementById('alunoDataNasc').value;
        const objetivo = document.getElementById('alunoObjetivo').value.trim();
        const observacoes = document.getElementById('alunoObs').value.trim();

        if (!nome || !email || !senha) {
            alert('Preencha todos os campos obrigatórios!');
            return;
        }

        if (senha.length < 6) {
            alert('A senha deve ter no mínimo 6 caracteres!');
            return;
        }

        console.log('Iniciando cadastro de aluno:', email);

        const { data: existingProfile, error: checkError } = await supabase
            .from('fit_profiles')
            .select('id, user_type')
            .eq('email', email)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }

        let profileId = null;

        if (existingProfile) {
            console.log('Email já cadastrado:', existingProfile);

            const { data: alunoExistente } = await supabase
                .from('fit_alunos')
                .select('id')
                .eq('personal_id', currentUser.id)
                .eq('profile_id', existingProfile.id)
                .maybeSingle();

            if (alunoExistente) {
                alert('Este aluno já está cadastrado na sua lista!');
                return;
            }

            profileId = existingProfile.id;
            
            await supabase
                .from('fit_profiles')
                .update({
                    full_name: nome,
                    phone: telefone || null,
                    user_type: 'aluno'
                })
                .eq('id', profileId);

            console.log('Profile existente atualizado');

        } else {
            console.log('Criando novo usuário no Auth...');

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

            if (authError) {
                console.error('Erro no Auth:', authError);
                throw authError;
            }

            if (!authData.user) {
                throw new Error('Erro ao criar usuário no sistema de autenticação.');
            }

            profileId = authData.user.id;
            console.log('Usuário criado no Auth:', profileId);

            const { error: profileError } = await supabase
                .from('fit_profiles')
                .insert({
                    id: profileId,
                    email: email,
                    full_name: nome,
                    phone: telefone || null,
                    user_type: 'aluno'
                });

            if (profileError) {
                console.error('Erro ao criar profile:', profileError);
                throw profileError;
            }

            console.log('Profile criado em fit_profiles');
        }

        const alunoData = {
            personal_id: currentUser.id,
            profile_id: profileId,
            data_nascimento: dataNasc || null,
            objetivo: objetivo || null,
            observacoes: observacoes || null,
            ativo: true
        };

        const { error: alunoError } = await supabase
            .from('fit_alunos')
            .insert(alunoData);

        if (alunoError) {
            console.error('Erro ao criar aluno:', alunoError);
            throw alunoError;
        }

        console.log('Aluno vinculado com sucesso!');

        alert('Aluno cadastrado com sucesso!\n\nCredenciais de acesso:\nEmail: ' + email + '\nSenha: (a senha cadastrada)\n\nO aluno já pode fazer login no sistema.');
        
        bootstrap.Modal.getInstance(document.getElementById('alunoModal')).hide();
        document.getElementById('alunoForm').reset();
        
        loadAlunos();
        loadAlunoSelects();
        loadDashboardData();

    } catch (error) {
        console.error('Erro ao salvar aluno:', error);
        
        let errorMsg = 'Erro ao cadastrar aluno: ';
        
        if (error.message.includes('duplicate key')) {
            errorMsg += 'Este email já está cadastrado.';
        } else if (error.message.includes('Password')) {
            errorMsg += 'A senha deve ter no mínimo 6 caracteres.';
        } else {
            errorMsg += error.message;
        }
        
        alert(errorMsg);
    }
}

async function deleteAluno(alunoId) {
    if (!confirm('Tem certeza que deseja excluir este aluno? Todos os treinos, dietas e medidas relacionados também serão excluídos.')) return;

    try {
        const { error } = await supabase
            .from('fit_alunos')
            .delete()
            .eq('id', alunoId);

        if (error) throw error;

        alert('Aluno excluído com sucesso!');
        loadAlunos();
        loadAlunoSelects();
        loadDashboardData();
    } catch (error) {
        console.error('Erro ao excluir aluno:', error);
        alert('Erro ao excluir aluno: ' + error.message);
    }
}

async function loadAlunoSelects() {
    try {
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
            'alunoMedidasSelect',
            'notifDestinatarios'
        ];

        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                if (selectId === 'notifDestinatarios') {
                    select.innerHTML = '<option value="todos">Todos os Alunos</option>';
                } else {
                    select.innerHTML = '<option value="">Selecione um aluno...</option>';
                }
                
                alunos?.forEach(aluno => {
                    const option = document.createElement('option');
                    option.value = selectId === 'notifDestinatarios' ? aluno.profile_id : aluno.id;
                    option.textContent = aluno.profile?.full_name || 'Sem nome';
                    select.appendChild(option);
                });
            }
        });
    } catch (error) {
        console.error('Erro ao carregar selects:', error);
    }
}

// ========================================
// MODAL DETALHES DO ALUNO
// ========================================

async function showAlunoDetails(alunoId) {
    try {
        // Guarda o ID do aluno atual
        currentAlunoDetailsId = alunoId;
        
        console.log('Carregando detalhes do aluno:', alunoId);
    const aluno = currentAlunos.find(a => a.id === alunoId);
    
    if (!aluno) return;
    
    document.getElementById('alunoDetailsName').textContent = aluno.profile?.full_name || 'N/A';
    document.getElementById('alunoDetailsEmail').textContent = aluno.profile?.email || 'N/A';
    
    loadAlunoInfo(aluno);
    
    const modal = new bootstrap.Modal(document.getElementById('alunoDetailsModal'));
    modal.show();
    
    document.querySelectorAll('#alunoDetailsTabs button').forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(e) {
            const target = e.target.getAttribute('data-bs-target');
            switch(target) {
                case '#treinos-pane':
                    loadAlunoTreinos(alunoId);
                    break;
                case '#dietas-pane':
                    loadAlunoDietas(alunoId);
                    break;
                case '#medidas-pane':
                    loadAlunoMedidasDetails(alunoId);
                    break;
                case '#agenda-pane':
                    loadAlunoAgenda(alunoId);
                    break;
            }
        });
    });
}

function loadAlunoInfo(aluno) {
    const content = document.getElementById('alunoInfoContent');
    content.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <p><strong>Nome:</strong> ${aluno.profile?.full_name || 'N/A'}</p>
                <p><strong>Email:</strong> ${aluno.profile?.email || 'N/A'}</p>
                <p><strong>Telefone:</strong> ${aluno.profile?.phone || 'Não informado'}</p>
                <p><strong>Data de Nascimento:</strong> ${aluno.data_nascimento ? new Date(aluno.data_nascimento).toLocaleDateString('pt-BR') : 'Não informado'}</p>
            </div>
            <div class="col-md-6">
                <p><strong>Status:</strong> 
                    <span class="badge ${aluno.ativo ? 'bg-success' : 'bg-secondary'}">
                        ${aluno.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                </p>
                <p><strong>Objetivo:</strong><br>${aluno.objetivo || 'Não informado'}</p>
                ${aluno.observacoes ? `<p><strong>Observações:</strong><br>${aluno.observacoes}</p>` : ''}
            </div>
        </div>
        <hr>
        <button class="btn btn-sm btn-primary" onclick="editAluno('${aluno.id}')">
            <i class="bi bi-pencil"></i> Editar Informações
        </button>
    `;
}

async function loadAlunoTreinos(alunoId) {
    const content = document.getElementById('alunoTreinosContent');
    content.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';
    
    try {
        const { data: treinos, error } = await supabase
            .from('fit_treinos')
            .select(`
                *,
                exercicios:fit_exercicios(count)
            `)
            .eq('aluno_id', alunoId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!treinos || treinos.length === 0) {
            content.innerHTML = '<div class="alert alert-info">Nenhum treino cadastrado</div>';
            return;
        }

        content.innerHTML = treinos.map(t => `
            <div class="card mb-2">
                <div class="card-body">
                    <h6>${t.nome}</h6>
                    ${t.descricao ? `<p class="mb-1 small text-muted">${t.descricao}</p>` : ''}
                    <small class="text-muted">
                        <i class="bi bi-clipboard-check"></i> ${t.exercicios?.[0]?.count || 0} exercícios
                    </small>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar treinos:', error);
        content.innerHTML = '<div class="alert alert-danger">Erro ao carregar treinos</div>';
    }
}

async function loadAlunoDietas(alunoId) {
    const content = document.getElementById('alunoDietasContent');
    content.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';
    
    try {
        const { data: dietas, error } = await supabase
            .from('fit_dietas')
            .select(`
                *,
                refeicoes:fit_refeicoes(count)
            `)
            .eq('aluno_id', alunoId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!dietas || dietas.length === 0) {
            content.innerHTML = '<div class="alert alert-info">Nenhuma dieta cadastrada</div>';
            return;
        }

        content.innerHTML = dietas.map(d => `
            <div class="card mb-2">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <div>
                            <h6>${d.nome}</h6>
                            ${d.descricao ? `<p class="mb-1 small text-muted">${d.descricao}</p>` : ''}
                            <small class="text-muted">
                                <i class="bi bi-egg-fried"></i> ${d.refeicoes?.[0]?.count || 0} refeições
                            </small>
                        </div>
                        <span class="badge ${d.ativa ? 'bg-success' : 'bg-secondary'}">
                            ${d.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar dietas:', error);
        content.innerHTML = '<div class="alert alert-danger">Erro ao carregar dietas</div>';
    }
}

async function loadAlunoMedidasDetails(alunoId) {
    const content = document.getElementById('alunoMedidasContent');
    content.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';
    
    try {
        const { data: medidas, error } = await supabase
            .from('fit_medidas')
            .select('*')
            .eq('aluno_id', alunoId)
            .order('data_medicao', { ascending: false })
            .limit(5);

        if (error) throw error;

        if (!medidas || medidas.length === 0) {
            content.innerHTML = '<div class="alert alert-info">Nenhuma medida registrada</div>';
            return;
        }

        content.innerHTML = `
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Peso</th>
                            <th>% Gordura</th>
                            <th>Cintura</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${medidas.map(m => `
                            <tr>
                                <td>${new Date(m.data_medicao).toLocaleDateString('pt-BR')}</td>
                                <td>${m.peso || '-'} kg</td>
                                <td>${m.percentual_gordura || '-'}%</td>
                                <td>${m.cintura || '-'} cm</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Erro ao carregar medidas:', error);
        content.innerHTML = '<div class="alert alert-danger">Erro ao carregar medidas</div>';
    }
}

async function loadAlunoAgenda(alunoId) {
    const content = document.getElementById('alunoAgendaContent');
    content.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';
    
    try {
        const { data: consultas, error } = await supabase
            .from('fit_agenda')
            .select('*')
            .eq('aluno_id', alunoId)
            .order('data_consulta', { ascending: true });

        if (error) throw error;

        if (!consultas || consultas.length === 0) {
            content.innerHTML = '<div class="alert alert-info">Nenhuma consulta agendada</div>';
            return;
        }

        content.innerHTML = consultas.map(c => {
            const data = new Date(c.data_consulta);
            const isPast = data < new Date();
            return `
                <div class="card mb-2 ${isPast ? 'bg-light' : ''}">
                    <div class="card-body py-2">
                        <div class="d-flex justify-content-between">
                            <div>
                                <strong>${c.tipo_consulta}</strong><br>
                                <small>${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</small>
                            </div>
                            <span class="badge ${isPast ? 'bg-secondary' : 'bg-primary'}">
                                ${isPast ? 'Realizada' : c.status}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Erro ao carregar agenda:', error);
        content.innerHTML = '<div class="alert alert-danger">Erro ao carregar agenda</div>';
    }
}

function quickAddTreino(alunoId) {
    selectedAlunoId = alunoId;
    document.getElementById('treinoAluno').value = alunoId;
    openTreinoModal();
    const modal = new bootstrap.Modal(document.getElementById('treinoModal'));
    modal.show();
}

function quickAddDieta(alunoId) {
    selectedAlunoId = alunoId;
    document.getElementById('dietaAluno').value = alunoId;
    openDietaModal();
    const modal = new bootstrap.Modal(document.getElementById('dietaModal'));
    modal.show();
}

function quickAddMedida(alunoId) {
    selectedAlunoId = alunoId;
    document.getElementById('medidaAluno').value = alunoId;
    openMedidaModal();
    const modal = new bootstrap.Modal(document.getElementById('medidaModal'));
    modal.show();
}

function quickAddAgenda(alunoId) {
    selectedAlunoId = alunoId;
    document.getElementById('agendaAluno').value = alunoId;
    openAgendaModal();
    const modal = new bootstrap.Modal(document.getElementById('agendaModal'));
    modal.show();
// ========================================
// AÇÕES RÁPIDAS DO MODAL DE DETALHES
// ========================================

let currentAlunoDetailsId = null; // Variável global para guardar ID do aluno

// Abrir modal de treino a partir dos detalhes do aluno
function quickAddTreinoFromDetails() {
    // Fecha o modal de detalhes
    const detailsModal = bootstrap.Modal.getInstance(document.getElementById('alunoDetailsModal'));
    if (detailsModal) {
        detailsModal.hide();
    }
    
    // Aguarda o modal fechar completamente
    setTimeout(() => {
        // Pré-seleciona o aluno
        const alunoSelect = document.getElementById('treinoAluno');
        if (alunoSelect && currentAlunoDetailsId) {
            alunoSelect.value = currentAlunoDetailsId;
        }
        
        // Abre o modal de treino
        openTreinoModal();
        const treinoModal = new bootstrap.Modal(document.getElementById('treinoModal'));
        treinoModal.show();
    }, 300);
}

// Abrir modal de dieta a partir dos detalhes do aluno
function quickAddDietaFromDetails() {
    const detailsModal = bootstrap.Modal.getInstance(document.getElementById('alunoDetailsModal'));
    if (detailsModal) {
        detailsModal.hide();
    }
    
    setTimeout(() => {
        const alunoSelect = document.getElementById('dietaAluno');
        if (alunoSelect && currentAlunoDetailsId) {
            alunoSelect.value = currentAlunoDetailsId;
        }
        
        openDietaModal();
        const dietaModal = new bootstrap.Modal(document.getElementById('dietaModal'));
        dietaModal.show();
    }, 300);
}

// Abrir modal de medidas a partir dos detalhes do aluno
function quickAddMedidaFromDetails() {
    const detailsModal = bootstrap.Modal.getInstance(document.getElementById('alunoDetailsModal'));
    if (detailsModal) {
        detailsModal.hide();
    }
    
    setTimeout(() => {
        const alunoSelect = document.getElementById('medidaAluno');
        if (alunoSelect && currentAlunoDetailsId) {
            alunoSelect.value = currentAlunoDetailsId;
        }
        
        openMedidaModal();
        const medidaModal = new bootstrap.Modal(document.getElementById('medidaModal'));
        medidaModal.show();
    }, 300);
}

// Abrir modal de agenda a partir dos detalhes do aluno
function quickAddAgendaFromDetails() {
    const detailsModal = bootstrap.Modal.getInstance(document.getElementById('alunoDetailsModal'));
    if (detailsModal) {
        detailsModal.hide();
    }
    
    setTimeout(() => {
        const alunoSelect = document.getElementById('agendaAluno');
        if (alunoSelect && currentAlunoDetailsId) {
            alunoSelect.value = currentAlunoDetailsId;
        }
        
        openAgendaModal();
        const agendaModal = new bootstrap.Modal(document.getElementById('agendaModal'));
        agendaModal.show();
    }, 300);
}


// ========================================
// CRUD TREINOS
// ========================================

function openTreinoModal() {
    document.getElementById('treinoForm').reset();
    document.getElementById('exerciciosContainer').innerHTML = `
        <div class="exercicio-item card mb-2 p-3">
            <div class="row">
                <div class="col-md-6 mb-2">
                    <label>Nome do Exercício</label>
                    <input type="text" class="form-control exercicio-nome" required>
                </div>
                <div class="col-md-3 mb-2">
                    <label>Séries</label>
                    <input type="number" class="form-control exercicio-series" required>
                </div>
                <div class="col-md-3 mb-2">
                    <label>Repetições</label>
                    <input type="text" class="form-control exercicio-reps" required>
                </div>
                <div class="col-md-4 mb-2">
                    <label>Descanso</label>
                    <input type="text" class="form-control exercicio-descanso" placeholder="ex: 60s">
                </div>
                <div class="col-md-8 mb-2">
                    <label>Vídeo Demonstrativo</label>
                    <input type="file" class="form-control exercicio-video" accept="video/*">
                </div>
                <div class="col-12">
                    <label>Observações</label>
                    <textarea class="form-control exercicio-obs" rows="2"></textarea>
                </div>
            </div>
        </div>
    `;
}

function addExercicioField() {
    const container = document.getElementById('exerciciosContainer');
    const newItem = document.querySelector('.exercicio-item').cloneNode(true);
    newItem.querySelectorAll('input, textarea').forEach(input => {
        if (input.type !== 'file') {
            input.value = '';
        } else {
            input.value = null;
        }
    });
    container.appendChild(newItem);
}

async function saveTreino() {
    try {
        const alunoId = document.getElementById('treinoAluno').value;
        const nome = document.getElementById('treinoNome').value;
        const descricao = document.getElementById('treinoDesc').value;

        if (!alunoId) {
            alert('Selecione um aluno!');
            return;
        }

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

        const exercicioItems = document.querySelectorAll('.exercicio-item');
        let ordem = 1;

        for (const item of exercicioItems) {
            const nomeExerc = item.querySelector('.exercicio-nome').value;
            if (!nomeExerc) continue;
            
            const series = item.querySelector('.exercicio-series').value;
            const reps = item.querySelector('.exercicio-reps').value;
            const descanso = item.querySelector('.exercicio-descanso').value;
            const obs = item.querySelector('.exercicio-obs').value;
            const videoFile = item.querySelector('.exercicio-video').files[0];

            let videoUrl = null;

            if (videoFile) {
                const fileName = `${currentUser.id}/${Date.now()}_${videoFile.name}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('exercise-videos')
                    .upload(fileName, videoFile);

                if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage
                        .from('exercise-videos')
                        .getPublicUrl(fileName);
                    videoUrl = publicUrl;
                }
            }

            await supabase.from('fit_exercicios').insert({
                treino_id: treino.id,
                nome: nomeExerc,
                series: series,
                repeticoes: reps,
                descanso: descanso,
                observacoes: obs,
                video_url: videoUrl,
                ordem: ordem++
            });
        }

        alert('Treino criado com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('treinoModal')).hide();
        loadTreinos();
        loadDashboardData();
    } catch (error) {
        console.error('Erro ao salvar treino:', error);
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
                ),
                exercicios:fit_exercicios(count)
            `)
            .eq('personal_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        renderTreinos(treinos);
    } catch (error) {
        console.error('Erro ao carregar treinos:', error);
    }
}

function renderTreinos(treinos) {
    const container = document.getElementById('treinosList');
    
    if (!treinos || treinos.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> Nenhum treino criado ainda. Cadastre alunos primeiro.
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    treinos.forEach(treino => {
        const card = document.createElement('div');
        card.className = 'card mb-3';
        card.innerHTML = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h5>${treino.nome}</h5>
                        <p class="text-muted mb-1">
                            <i class="bi bi-person"></i> ${treino.aluno?.profile?.full_name || 'N/A'}
                        </p>
                        ${treino.descricao ? `<p class="mb-1">${treino.descricao}</p>` : ''}
                        <small class="text-muted">
                            <i class="bi bi-clipboard-check"></i> ${treino.exercicios?.[0]?.count || 0} exercícios
                        </small>
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="deleteTreino('${treino.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
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
        loadTreinos();
        loadDashboardData();
    } catch (error) {
        console.error('Erro ao excluir treino:', error);
        alert('Erro ao excluir treino: ' + error.message);
    }
}

// ========================================
// CRUD DIETAS
// ========================================

function openDietaModal() {
    document.getElementById('dietaForm').reset();
    document.getElementById('dietaInicio').value = new Date().toISOString().split('T')[0];
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
                    <textarea class="form-control refeicao-alimentos" rows="2" required></textarea>
                </div>
                <div class="col-12">
                    <label>Observações</label>
                    <textarea class="form-control refeicao-obs" rows="1"></textarea>
                </div>
            </div>
        </div>
    `;
}

function addRefeicaoField() {
    const container = document.getElementById('refeicoesContainer');
    const newItem = document.querySelector('.refeicao-item').cloneNode(true);
    newItem.querySelectorAll('input, textarea, select').forEach(input => input.value = '');
    container.appendChild(newItem);
}

async function saveDieta() {
    try {
        const alunoId = document.getElementById('dietaAluno').value;
        const nome = document.getElementById('dietaNome').value;
        const descricao = document.getElementById('dietaDesc').value;
        const dataInicio = document.getElementById('dietaInicio').value;
        const dataFim = document.getElementById('dietaFim').value;

        if (!alunoId) {
            alert('Selecione um aluno!');
            return;
        }

        if (!nome) {
            alert('Digite o nome da dieta!');
            return;
        }

        console.log('Criando dieta...');

        const { data: dieta, error: dietaError } = await supabase
            .from('fit_dietas')
            .insert({
                aluno_id: alunoId,
                personal_id: currentUser.id,
                nome: nome,
                descricao: descricao,
                data_inicio: dataInicio,
                data_fim: dataFim || null,
                ativa: true
            })
            .select()
            .single();

        if (dietaError) {
            console.error('Erro ao criar dieta:', dietaError);
            throw dietaError;
        }

        console.log('Dieta criada:', dieta);

        const refeicaoItems = document.querySelectorAll('.refeicao-item');
        let refeicoesAdicionadas = 0;

        for (const item of refeicaoItems) {
            const tipo = item.querySelector('.refeicao-tipo').value;
            const horario = item.querySelector('.refeicao-horario').value;
            const alimentos = item.querySelector('.refeicao-alimentos').value.trim();
            const obs = item.querySelector('.refeicao-obs').value.trim();

            if (!alimentos) {
                console.log('Refeição sem alimentos, pulando...');
                continue;
            }

            console.log('Inserindo refeição:', tipo);

            const { data: refeicao, error: refeicaoError } = await supabase
                .from('fit_refeicoes')
                .insert({
                    dieta_id: dieta.id,
                    tipo_refeicao: tipo,
                    horario: horario || null,
                    alimentos: alimentos,
                    observacoes: obs || null
                })
                .select()
                .single();

            if (refeicaoError) {
                console.error('Erro ao inserir refeição:', refeicaoError);
                throw refeicaoError;
            }

            console.log('Refeição inserida:', refeicao);
            refeicoesAdicionadas++;
        }

        if (refeicoesAdicionadas === 0) {
            alert('Atenção: Dieta criada, mas nenhuma refeição foi adicionada. Adicione pelo menos uma refeição!');
        } else {
            alert(`Dieta criada com sucesso com ${refeicoesAdicionadas} refeição(ões)!`);
        }

        bootstrap.Modal.getInstance(document.getElementById('dietaModal')).hide();
        loadDietas();
        loadDashboardData();
    } catch (error) {
        console.error('Erro ao salvar dieta:', error);
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
                ),
                refeicoes:fit_refeicoes(count)
            `)
            .eq('personal_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        renderDietas(dietas);
    } catch (error) {
        console.error('Erro ao carregar dietas:', error);
    }
}

function renderDietas(dietas) {
    const container = document.getElementById('dietasList');
    
    if (!dietas || dietas.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> Nenhuma dieta criada ainda. Cadastre alunos primeiro.
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    dietas.forEach(dieta => {
        const card = document.createElement('div');
        card.className = 'card mb-3';
        card.innerHTML = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h5>${dieta.nome}</h5>
                        <p class="text-muted mb-1">
                            <i class="bi bi-person"></i> ${dieta.aluno?.profile?.full_name || 'N/A'}
                        </p>
                        ${dieta.descricao ? `<p class="mb-1">${dieta.descricao}</p>` : ''}
                        <small class="text-muted">
                            <i class="bi bi-egg-fried"></i> ${dieta.refeicoes?.[0]?.count || 0} refeições
                        </small>
                        <br>
                        <span class="badge ${dieta.ativa ? 'bg-success' : 'bg-secondary'} mt-2">
                            ${dieta.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="deleteDieta('${dieta.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
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
        loadDietas();
        loadDashboardData();
    } catch (error) {
        console.error('Erro ao excluir dieta:', error);
        alert('Erro ao excluir dieta: ' + error.message);
    }
}

// ========================================
// MEDIDAS
// ========================================

function openMedidaModal() {
    document.getElementById('medidaForm').reset();
    document.getElementById('medidaData').value = new Date().toISOString().split('T')[0];
}

async function saveMedida() {
    try {
        const alunoId = document.getElementById('medidaAluno').value;
        
        if (!alunoId) {
            alert('Selecione um aluno!');
            return;
        }

        const medidaData = {
            aluno_id: alunoId,
            personal_id: currentUser.id,
            data_medicao: document.getElementById('medidaData').value,
            peso: document.getElementById('medidaPeso').value || null,
            altura: document.getElementById('medidaAltura').value || null,
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
            percentual_gordura: document.getElementById('medidaGordura').value || null,
            observacoes: document.getElementById('medidaObs').value
        };

        const { error } = await supabase
            .from('fit_medidas')
            .insert(medidaData);

        if (error) throw error;

        alert('Medidas registradas com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('medidaModal')).hide();
        
        if (document.getElementById('alunoMedidasSelect').value === alunoId) {
            loadMedidas();
        }
    } catch (error) {
        console.error('Erro ao salvar medidas:', error);
        alert('Erro ao salvar medidas: ' + error.message);
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

        renderMedidasChart(medidas);
    } catch (error) {
        console.error('Erro ao carregar medidas:', error);
    }
}

function renderMedidasChart(medidas) {
    const content = document.getElementById('medidasContent');
    
    if (medidas.length === 0) {
        content.innerHTML = '<div class="alert alert-warning">Nenhuma medida registrada para este aluno.</div>';
        return;
    }

    const labels = medidas.map(m => new Date(m.data_medicao).toLocaleDateString('pt-BR')).reverse();
    const pesoData = medidas.map(m => m.peso).reverse();

    content.innerHTML = `
        <div class="card mb-3">
            <div class="card-body">
                <h5>Evolução de Peso</h5>
                <canvas id="pesoChart"></canvas>
            </div>
        </div>
        <div class="card">
            <div class="card-body">
                <h5>Histórico de Medidas</h5>
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Peso</th>
                                <th>% Gordura</th>
                                <th>Cintura</th>
                                <th>Quadril</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${medidas.map(m => `
                                <tr>
                                    <td>${new Date(m.data_medicao).toLocaleDateString('pt-BR')}</td>
                                    <td>${m.peso || '-'} kg</td>
                                    <td>${m.percentual_gordura || '-'}%</td>
                                    <td>${m.cintura || '-'} cm</td>
                                    <td>${m.quadril || '-'} cm</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    const ctx = document.getElementById('pesoChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Peso (kg)',
                data: pesoData,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });
}

// ========================================
// AGENDA - CRUD COMPLETO
// ========================================

function openAgendaModal(agendaId = null) {
    document.getElementById('agendaForm').reset();
    document.getElementById('agendaId').value = '';
    
    if (agendaId) {
        loadAgendaData(agendaId);
        document.querySelector('#agendaModal .modal-title').textContent = 'Editar Consulta';
    } else {
        document.querySelector('#agendaModal .modal-title').textContent = 'Agendar Consulta';
        const statusSelect = document.getElementById('agendaStatus');
        if (statusSelect) statusSelect.value = 'agendada';
    }
}

async function loadAgendaData(agendaId) {
    try {
        const { data, error } = await supabase
            .from('fit_agenda')
            .select('*')
            .eq('id', agendaId)
            .single();

        if (error) throw error;

        if (data) {
            document.getElementById('agendaId').value = data.id;
            document.getElementById('agendaAluno').value = data.aluno_id;
            
            // Tratar data_consulta de forma segura
            if (data.data_consulta) {
                // Remove qualquer timezone e trata como horário local
                let dataStr = data.data_consulta.replace(' ', 'T').split('+')[0].split('Z')[0];
                
                // Se tem menos de 16 caracteres, completar com segundos
                if (dataStr.length === 16) {
                    dataStr += ':00';
                }
                
                // Extrair partes da data
                const [datePart, timePart] = dataStr.split('T');
                const datetimeLocal = `${datePart}T${timePart.substring(0, 5)}`;
                
                console.log('Data do banco:', data.data_consulta);
                console.log('Data formatada para input:', datetimeLocal);
                
                document.getElementById('agendaDataHora').value = datetimeLocal;
            }
            
            document.getElementById('agendaTipo').value = data.tipo_consulta;
            
            const statusSelect = document.getElementById('agendaStatus');
            if (statusSelect) statusSelect.value = data.status || 'agendada';
            
            document.getElementById('agendaObs').value = data.observacoes || '';
        }
    } catch (error) {
        console.error('Erro ao carregar dados da agenda:', error);
        alert('Erro ao carregar dados da consulta');
    }
}

async function saveAgenda() {
    try {
        const agendaId = document.getElementById('agendaId').value;
        const alunoId = document.getElementById('agendaAluno').value;
        const dataHoraInput = document.getElementById('agendaDataHora').value;
        
        if (!alunoId) {
            alert('Selecione um aluno!');
            return;
        }

        if (!dataHoraInput) {
            alert('Selecione a data e hora da consulta!');
            return;
        }

        // Formatar data para o formato que o Supabase espera (sem conversão de timezone)
        // O input datetime-local já retorna no formato: "2025-10-07T13:00"
        const dataFormatada = dataHoraInput.replace('T', ' ') + ':00';

        console.log('Data/hora do input:', dataHoraInput);
        console.log('Data formatada para banco:', dataFormatada);

        const agendaData = {
            personal_id: currentUser.id,
            aluno_id: alunoId,
            data_consulta: dataFormatada,
            tipo_consulta: document.getElementById('agendaTipo').value,
            observacoes: document.getElementById('agendaObs').value
        };

        const statusSelect = document.getElementById('agendaStatus');
        if (statusSelect) {
            agendaData.status = statusSelect.value;
        } else {
            agendaData.status = 'agendada';
        }

        let error;

        if (agendaId) {
            console.log('Atualizando consulta:', agendaId);
            const result = await supabase
                .from('fit_agenda')
                .update(agendaData)
                .eq('id', agendaId);
            error = result.error;
            
            if (!error) {
                alert('Consulta atualizada com sucesso!');
            }
        } else {
            console.log('Criando nova consulta');
            const result = await supabase
                .from('fit_agenda')
                .insert(agendaData);
            error = result.error;
            
            if (!error) {
                alert('Consulta agendada com sucesso!');
            }
        }

        if (error) throw error;

        bootstrap.Modal.getInstance(document.getElementById('agendaModal')).hide();
        loadAgenda();
        loadDashboardData();
    } catch (error) {
        console.error('Erro ao salvar agenda:', error);
        alert('Erro ao salvar consulta: ' + error.message);
    }
}

function editAgenda(agendaId) {
    openAgendaModal(agendaId);
    const modal = new bootstrap.Modal(document.getElementById('agendaModal'));
    modal.show();
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
        loadAgenda();
        loadDashboardData();
    } catch (error) {
        console.error('Erro ao excluir agenda:', error);
        alert('Erro ao excluir consulta: ' + error.message);
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
            .order('data_consulta', { ascending: true });

        if (error) throw error;

        renderAgenda(consultas);
    } catch (error) {
        console.error('Erro ao carregar agenda:', error);
    }
}

function renderAgenda(consultas) {
    const container = document.getElementById('agendaCalendar');
    
    if (!consultas || consultas.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Nenhuma consulta agendada</div>';
        return;
    }

    container.innerHTML = '<div class="list-group">';

    consultas.forEach(consulta => {
        // Tratar data de forma segura
        let dataFormatada = 'Data inválida';
        let horaFormatada = '';
        let isPast = false;
        
        try {
            if (consulta.data_consulta) {
                // Remove timezone e trata como horário local
                const dataStr = consulta.data_consulta.replace(' ', 'T').split('+')[0].split('Z')[0];
                const data = new Date(dataStr);
                
                if (!isNaN(data.getTime())) {
                    dataFormatada = data.toLocaleDateString('pt-BR');
                    horaFormatada = data.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
                    isPast = data < new Date();
                }
            }
        } catch (e) {
            console.error('Erro ao formatar data:', e);
        }
        
        container.innerHTML += `
            <div class="list-group-item ${isPast ? 'bg-light' : ''}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h6 class="mb-0">${consulta.aluno?.profile?.full_name || 'N/A'}</h6>
                            <span class="badge bg-${isPast ? 'secondary' : consulta.status === 'agendada' ? 'primary' : 'success'}">
                                ${isPast ? 'Realizada' : consulta.status}
                            </span>
                        </div>
                        <p class="mb-1">
                            <i class="bi bi-calendar"></i> ${dataFormatada} às ${horaFormatada}
                        </p>
                        <p class="mb-1"><strong>${consulta.tipo_consulta}</strong></p>
                        ${consulta.observacoes ? `<p class="mb-0 text-muted small">${consulta.observacoes}</p>` : ''}
                    </div>
                    <div class="ms-3 d-flex flex-column gap-2">
                        ${!isPast ? `
                            <button class="btn btn-sm btn-outline-primary" onclick="editAgenda('${consulta.id}')" title="Editar">
                                <i class="bi bi-pencil"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteAgenda('${consulta.id}')" title="Excluir">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML += '</div>';
}

// ========================================
// NOTIFICAÇÕES
// ========================================

document.getElementById('notificationForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
        const destinatarios = Array.from(document.getElementById('notifDestinatarios').selectedOptions).map(opt => opt.value);
        const titulo = document.getElementById('notifTitulo').value;
        const mensagem = document.getElementById('notifMensagem').value;

        let playerIds = [];
        
        if (destinatarios.includes('todos')) {
            const { data: subs } = await supabase
                .from('fit_push_subscriptions')
                .select('player_id')
                .in('user_id', currentAlunos.map(a => a.profile_id));
            
            playerIds = subs?.map(s => s.player_id) || [];
        } else {
            const { data: subs } = await supabase
                .from('fit_push_subscriptions')
                .select('player_id')
                .in('user_id', destinatarios);
            
            playerIds = subs?.map(s => s.player_id) || [];
        }

        if (playerIds.length === 0) {
            alert('Nenhum aluno com notificações ativadas encontrado.');
            return;
        }

        alert('Recurso de notificações será implementado quando o OneSignal estiver configurado.');
        document.getElementById('notificationForm').reset();
        
    } catch (error) {
        console.error('Erro ao enviar notificação:', error);
        alert('Erro ao enviar notificação: ' + error.message);
    }
});

// ========================================
// BUSCA/FILTRO DE ALUNOS
// ========================================

function filterAlunos() {
    const searchTerm = document.getElementById('searchAluno').value.toLowerCase().trim();
    const resultsElement = document.getElementById('searchResults');
    
    if (!searchTerm) {
        renderAlunosTable(currentAlunos);
        resultsElement.textContent = '';
        return;
    }
    
    const filteredAlunos = currentAlunos.filter(aluno => {
        const nome = (aluno.profile?.full_name || '').toLowerCase();
        const email = (aluno.profile?.email || '').toLowerCase();
        const telefone = (aluno.profile?.phone || '').toLowerCase();
        const objetivo = (aluno.objetivo || '').toLowerCase();
        
        return nome.includes(searchTerm) || 
               email.includes(searchTerm) || 
               telefone.includes(searchTerm) ||
               objetivo.includes(searchTerm);
    });
    
    if (filteredAlunos.length === 0) {
        resultsElement.innerHTML = '<i class="bi bi-info-circle"></i> Nenhum aluno encontrado com estes critérios';
        resultsElement.style.color = '#e74c3c';
    } else if (filteredAlunos.length === 1) {
        resultsElement.innerHTML = `<i class="bi bi-check-circle"></i> 1 aluno encontrado`;
        resultsElement.style.color = '#2ecc71';
    } else {
        resultsElement.innerHTML = `<i class="bi bi-check-circle"></i> ${filteredAlunos.length} alunos encontrados`;
        resultsElement.style.color = '#2ecc71';
    }
    
    renderAlunosTable(filteredAlunos);
}

// ========================================
// FUNÇÃO AUXILIAR MOBILE
// ========================================

function closeSidebar() {
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('active');
        document.getElementById('sidebar-overlay')?.classList.remove('active');
    }
}
