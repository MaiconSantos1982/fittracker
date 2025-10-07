let currentUser = null;
let currentAlunos = [];

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
    document.querySelectorAll('#sidebar a[data-section]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.closest('a').dataset.section;
            showSection(section);
            
            // Atualizar classe active
            document.querySelectorAll('#sidebar a').forEach(a => a.classList.remove('active'));
            e.target.closest('a').classList.add('active');
        });
    });

    // Toggle sidebar (desktop)
    const sidebarCollapseBtn = document.getElementById('sidebarCollapse');
    if (sidebarCollapseBtn) {
        sidebarCollapseBtn.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
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
        const today = new Date().toISOString().split('T')[0];
        const { data: consultas } = await supabase
            .from('fit_agenda')
            .select('*', { count: 'exact' })
            .eq('personal_id', currentUser.id)
            .gte('data_consulta', today + ' 00:00:00')
            .lte('data_consulta', today + ' 23:59:59');

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
            .eq('personal_id', currentUser.id);

        if (error) throw error;

        currentAlunos = data || [];
        console.log('Alunos carregados:', currentAlunos.length);
        renderAlunosTable(currentAlunos);
    } catch (error) {
        console.error('Erro ao carregar alunos:', error);
    }
}

function renderAlunosTable(alunos) {
    const tbody = document.getElementById('alunosTable');
    
    if (!alunos || alunos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="bi bi-people" style="font-size: 48px; opacity: 0.3;"></i>
                    <p class="mt-2">Nenhum aluno cadastrado ainda</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';

    alunos.forEach(aluno => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${aluno.profile?.full_name || 'N/A'}</td>
            <td>${aluno.profile?.email || 'N/A'}</td>
            <td>${aluno.profile?.phone || '-'}</td>
            <td>
                <span class="badge ${aluno.ativo ? 'bg-success' : 'bg-secondary'}">
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

function openAlunoModal(alunoId = null) {
    document.getElementById('alunoForm').reset();
    document.getElementById('alunoId').value = '';
    
    if (alunoId) {
        const aluno = currentAlunos.find(a => a.id === alunoId);
        if (aluno) {
            document.getElementById('alunoId').value = aluno.id;
            document.getElementById('alunoEmail').value = aluno.profile?.email || '';
            document.getElementById('alunoDataNasc').value = aluno.data_nascimento || '';
            document.getElementById('alunoObjetivo').value = aluno.objetivo || '';
            document.getElementById('alunoObs').value = aluno.observacoes || '';
        }
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

        // Validações
        if (!nome || !email || !senha) {
            alert('Preencha todos os campos obrigatórios!');
            return;
        }

        if (senha.length < 6) {
            alert('A senha deve ter no mínimo 6 caracteres!');
            return;
        }

        console.log('Iniciando cadastro de aluno:', email);

        // 1. Verificar se o email já existe em fit_profiles
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
            // Email já existe
            console.log('Email já cadastrado:', existingProfile);

            // Verificar se já é aluno deste personal
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

            // Usar o profile existente
            profileId = existingProfile.id;
            
            // Atualizar dados do profile (se necessário)
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
            // Email NÃO existe - criar novo usuário
            console.log('Criando novo usuário no Auth...');

            // 2. Criar usuário no Supabase Auth
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

            // 3. Criar perfil em fit_profiles
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

        // 4. Criar vínculo em fit_alunos
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

// Carregar selects de alunos
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
                    // Manter opção "todos"
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
            if (!nomeExerc) continue;
            
            const series = item.querySelector('.exercicio-series').value;
            const reps = item.querySelector('.exercicio-reps').value;
            const descanso = item.querySelector('.exercicio-descanso').value;
            const obs = item.querySelector('.exercicio-obs').value;
            const videoFile = item.querySelector('.exercicio-video').files[0];

            let videoUrl = null;

            // Upload de vídeo se fornecido
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

        // Criar dieta
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

        if (dietaError) throw dietaError;

        // Adicionar refeições
        const refeicaoItems = document.querySelectorAll('.refeicao-item');

        for (const item of refeicaoItems) {
            const tipo = item.querySelector('.refeicao-tipo').value;
            const horario = item.querySelector('.refeicao-horario').value;
            const alimentos = item.querySelector('.refeicao-alimentos').value;
            const obs = item.querySelector('.refeicao-obs').value;

            if (!alimentos) continue;

            await supabase.from('fit_refeicoes').insert({
                dieta_id: dieta.id,
                tipo_refeicao: tipo,
                horario: horario || null,
                alimentos: alimentos,
                observacoes: obs
            });
        }

        alert('Dieta criada com sucesso!');
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
        
        // Recarregar medidas se o aluno selecionado for o mesmo
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

    // Criar gráfico de evolução de peso
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

    // Criar gráfico
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
// AGENDA
// ========================================

function openAgendaModal() {
    document.getElementById('agendaForm').reset();
}

async function saveAgenda() {
    try {
        const alunoId = document.getElementById('agendaAluno').value;
        
        if (!alunoId) {
            alert('Selecione um aluno!');
            return;
        }

        const agendaData = {
            personal_id: currentUser.id,
            aluno_id: alunoId,
            data_consulta: document.getElementById('agendaDataHora').value,
            tipo_consulta: document.getElementById('agendaTipo').value,
            observacoes: document.getElementById('agendaObs').value,
            status: 'agendada'
        };

        const { error } = await supabase
            .from('fit_agenda')
            .insert(agendaData);

        if (error) throw error;

        alert('Consulta agendada com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('agendaModal')).hide();
        loadAgenda();
        loadDashboardData();
    } catch (error) {
        console.error('Erro ao salvar agenda:', error);
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
        const data = new Date(consulta.data_consulta);
        const isPast = data < new Date();
        
        container.innerHTML += `
            <div class="list-group-item ${isPast ? 'bg-light' : ''}">
                <div class="d-flex justify-content-between">
                    <h6>${consulta.aluno?.profile?.full_name || 'N/A'}</h6>
                    <span class="badge bg-${isPast ? 'secondary' : consulta.status === 'agendada' ? 'primary' : 'success'}">
                        ${isPast ? 'Realizada' : consulta.status}
                    </span>
                </div>
                <p class="mb-1">
                    <i class="bi bi-calendar"></i> ${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                </p>
                <p class="mb-1"><strong>${consulta.tipo_consulta}</strong></p>
                ${consulta.observacoes ? `<p class="mb-0 text-muted">${consulta.observacoes}</p>` : ''}
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

        // Buscar Player IDs
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

        // Enviar notificação via OneSignal REST API
        alert('Recurso de notificações será implementado quando o OneSignal estiver configurado.');
        document.getElementById('notificationForm').reset();
        
    } catch (error) {
        console.error('Erro ao enviar notificação:', error);
        alert('Erro ao enviar notificação: ' + error.message);
    }
});
