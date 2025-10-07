let currentUser = null;
let currentAlunoId = null;

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await checkAuth();
    await loadAlunoData();
    loadDashboardData();
    setupNavigation();
});

// Carregar dados do aluno
async function loadAlunoData() {
    try {
        const { data: aluno } = await supabase
            .from('fit_alunos')
            .select('id')
            .eq('profile_id', currentUser.id)
            .single();

        if (aluno) {
            currentAlunoId = aluno.id;
        }
    } catch (error) {
        console.error('Erro ao carregar dados do aluno:', error);
    }
}

// Navegação entre seções
function setupNavigation() {
    document.querySelectorAll('#sidebar a[data-section]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.closest('a').dataset.section;
            showSection(section);
        });
    });

    document.getElementById('sidebarCollapse')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });
}

function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById('section-' + sectionName).style.display = 'block';
    document.getElementById('currentSection').textContent = 
        sectionName.charAt(0).toUpperCase() + sectionName.slice(1);

    // Carregar dados específicos da seção
    switch(sectionName) {
        case 'treinos':
            loadTreinos();
            break;
        case 'dietas':
            loadDieta();
            break;
        case 'medidas':
            loadMedidas();
            break;
        case 'agenda':
            loadAgenda();
            break;
    }
}

// Dashboard Data
async function loadDashboardData() {
    try {
        // Treinos concluídos esta semana
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);

        const { data: execucoes } = await supabase
            .from('fit_treino_execucoes')
            .select('*')
            .eq('aluno_id', currentAlunoId)
            .eq('concluido', true)
            .gte('data_execucao', weekAgo.toISOString());

        if (execucoes) {
            document.getElementById('treinosConcluidos').textContent = execucoes.length;
        }

        // Próxima consulta
        const { data: consultas } = await supabase
            .from('fit_agenda')
            .select('*')
            .eq('aluno_id', currentAlunoId)
            .gte('data_consulta', new Date().toISOString())
            .order('data_consulta', { ascending: true })
            .limit(1);

        if (consultas && consultas.length > 0) {
            const data = new Date(consultas[0].data_consulta);
            document.getElementById('proximaConsulta').textContent = 
                data.toLocaleDateString('pt-BR') + ' às ' + 
                data.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
        }

        // Peso atual
        const { data: medidas } = await supabase
            .from('fit_medidas')
            .select('peso')
            .eq('aluno_id', currentAlunoId)
            .order('data_medicao', { ascending: false })
            .limit(1);

        if (medidas && medidas.length > 0 && medidas[0].peso) {
            document.getElementById('pesoAtual').textContent = medidas[0].peso;
        }
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

// Treinos
async function loadTreinos() {
    try {
        const { data: treinos, error } = await supabase
            .from('fit_treinos')
            .select(`
                *,
                exercicios:fit_exercicios(*)
            `)
            .eq('aluno_id', currentAlunoId)
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
        container.innerHTML = '<div class="alert alert-info">Nenhum treino cadastrado ainda.</div>';
        return;
    }

    container.innerHTML = '';

    treinos.forEach(treino => {
        const card = document.createElement('div');
        card.className = 'card mb-3';
        card.innerHTML = `
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">${treino.nome}</h5>
                <button class="btn btn-primary btn-sm" onclick="executarTreino('${treino.id}')">
                    <i class="bi bi-play-circle"></i> Executar
                </button>
            </div>
            <div class="card-body">
                ${treino.descricao ? `<p>${treino.descricao}</p>` : ''}
                <h6>Exercícios (${treino.exercicios?.length || 0}):</h6>
                <ul class="list-group list-group-flush">
                    ${treino.exercicios?.map(ex => `
                        <li class="list-group-item">
                            <strong>${ex.nome}</strong> - 
                            ${ex.series}x${ex.repeticoes} 
                            ${ex.descanso ? `(Descanso: ${ex.descanso})` : ''}
                        </li>
                    `).join('') || '<li class="list-group-item">Nenhum exercício cadastrado</li>'}
                </ul>
            </div>
        `;
        container.appendChild(card);
    });
}

async function executarTreino(treinoId) {
    try {
        const { data: exercicios } = await supabase
            .from('fit_exercicios')
            .select('*')
            .eq('treino_id', treinoId)
            .order('ordem', { ascending: true });

        const container = document.getElementById('exerciciosList');
        container.innerHTML = '';

        exercicios.forEach((ex, index) => {
            const div = document.createElement('div');
            div.className = 'card mb-3';
            div.innerHTML = `
                <div class="card-body">
                    <h5>${index + 1}. ${ex.nome}</h5>
                    <p><strong>Séries:</strong> ${ex.series} | <strong>Repetições:</strong> ${ex.repeticoes}</p>
                    ${ex.descanso ? `<p><strong>Descanso:</strong> ${ex.descanso}</p>` : ''}
                    ${ex.observacoes ? `<p><em>${ex.observacoes}</em></p>` : ''}
                    ${ex.video_url ? `
                        <video controls style="max-width: 100%; height: auto;">
                            <source src="${ex.video_url}" type="video/mp4">
                        </video>
                    ` : ''}
                    <hr>
                    <div class="row">
                        <div class="col-md-3">
                            <label>Carga</label>
                            <input type="text" class="form-control exercicio-carga" data-exercicio-id="${ex.id}" placeholder="Ex: 20kg">
                        </div>
                        <div class="col-md-6">
                            <label>Como se sentiu?</label>
                            <select class="form-select exercicio-sentimento" data-exercicio-id="${ex.id}">
                                <option value="Muito bem">Muito bem</option>
                                <option value="Bem">Bem</option>
                                <option value="Normal">Normal</option>
                                <option value="Cansado">Cansado</option>
                                <option value="Exausto">Exausto</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label>Concluído?</label>
                            <div class="form-check mt-2">
                                <input class="form-check-input exercicio-concluido" type="checkbox" data-exercicio-id="${ex.id}" checked>
                            </div>
                        </div>
                    </div>
                    <div class="mt-2">
                        <label>Observações</label>
                        <textarea class="form-control exercicio-obs" data-exercicio-id="${ex.id}" rows="2"></textarea>
                    </div>
                </div>
            `;
            container.appendChild(div);
        });

        new bootstrap.Modal(document.getElementById('executarTreinoModal')).show();
    } catch (error) {
        console.error('Erro ao executar treino:', error);
    }
}

async function finalizarTreino() {
    try {
        const exercicios = document.querySelectorAll('.exercicio-carga');
        
        for (const elem of exercicios) {
            const exercicioId = elem.dataset.exercicioId;
            const carga = elem.value;
            const sentimento = document.querySelector(`.exercicio-sentimento[data-exercicio-id="${exercicioId}"]`).value;
            const concluido = document.querySelector(`.exercicio-concluido[data-exercicio-id="${exercicioId}"]`).checked;
            const obs = document.querySelector(`.exercicio-obs[data-exercicio-id="${exercicioId}"]`).value;

            await supabase.from('fit_treino_execucoes').insert({
                exercicio_id: exercicioId,
                aluno_id: currentAlunoId,
                carga: carga,
                como_se_sentiu: sentimento,
                concluido: concluido,
                observacoes: obs
            });
        }

        alert('Treino registrado com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('executarTreinoModal')).hide();
        loadDashboardData();
    } catch (error) {
        console.error('Erro ao finalizar treino:', error);
        alert('Erro ao registrar treino: ' + error.message);
    }
}

// Dieta
async function loadDieta() {
    try {
        const { data: dieta } = await supabase
            .from('fit_dietas')
            .select(`
                *,
                refeicoes:fit_refeicoes(*)
            `)
            .eq('aluno_id', currentAlunoId)
            .eq('ativa', true)
            .single();

        if (!dieta) {
            document.getElementById('dietaContent').innerHTML = 
                '<div class="alert alert-info">Nenhuma dieta ativa no momento.</div>';
            return;
        }

        renderDieta(dieta);
    } catch (error) {
        console.error('Erro ao carregar dieta:', error);
        document.getElementById('dietaContent').innerHTML = 
            '<div class="alert alert-info">Nenhuma dieta ativa no momento.</div>';
    }
}

function renderDieta(dieta) {
    const container = document.getElementById('dietaContent');
    
    container.innerHTML = `
        <div class="card mb-3">
            <div class="card-header">
                <h4>${dieta.nome}</h4>
                ${dieta.descricao ? `<p>${dieta.descricao}</p>` : ''}
            </div>
            <div class="card-body">
                ${dieta.refeicoes?.map(ref => `
                    <div class="card mb-2">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6>${ref.tipo_refeicao} ${ref.horario ? `- ${ref.horario}` : ''}</h6>
                                    <p class="mb-1">${ref.alimentos}</p>
                                    ${ref.observacoes ? `<small class="text-muted">${ref.observacoes}</small>` : ''}
                                </div>
                                <button class="btn btn-sm btn-primary" onclick="registrarRefeicao('${ref.id}')">
                                    <i class="bi bi-pencil"></i> Registrar
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function registrarRefeicao(refeicaoId) {
    document.getElementById('refeicaoId').value = refeicaoId;
    document.getElementById('dietaRegistroForm').reset();
    new bootstrap.Modal(document.getElementById('registrarDietaModal')).show();
}

async function saveDietaRegistro() {
    try {
        const registro = {
            refeicao_id: document.getElementById('refeicaoId').value,
            aluno_id: currentAlunoId,
            o_que_comeu: document.getElementById('dietaOQueComeu').value,
            como_se_sentiu: document.getElementById('dietaComoSentiu').value,
            suficiente: document.getElementById('dietaSuficiente').value === 'true',
            sentiu_fome: document.getElementById('dietaSentiuFome').value === 'true',
            observacoes: document.getElementById('dietaObs').value
        };

        const { error } = await supabase
            .from('fit_dieta_registros')
            .insert(registro);

        if (error) throw error;

        alert('Refeição registrada com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('registrarDietaModal')).hide();
    } catch (error) {
        console.error('Erro ao salvar registro:', error);
        alert('Erro ao salvar registro: ' + error.message);
    }
}

// Medidas
async function loadMedidas() {
    try {
        const { data: medidas } = await supabase
            .from('fit_medidas')
            .select('*')
            .eq('aluno_id', currentAlunoId)
            .order('data_medicao', { ascending: false });

        if (!medidas || medidas.length === 0) {
            document.getElementById('medidasContent').innerHTML = 
                '<div class="alert alert-info">Nenhuma medida registrada ainda.</div>';
            return;
        }

        renderMedidas(medidas);
    } catch (error) {
        console.error('Erro ao carregar medidas:', error);
    }
}

function renderMedidas(medidas) {
    const container = document.getElementById('medidasContent');
    
    const labels = medidas.map(m => new Date(m.data_medicao).toLocaleDateString('pt-BR')).reverse();
    const pesoData = medidas.map(m => m.peso).reverse();
    const gorduraData = medidas.map(m => m.percentual_gordura).reverse();

    container.innerHTML = `
        <div class="row">
            <div class="col-md-6 mb-3">
                <div class="card">
                    <div class="card-body">
                        <h5>Evolução de Peso</h5>
                        <canvas id="pesoChart"></canvas>
                    </div>
                </div>
            </div>
            <div class="col-md-6 mb-3">
                <div class="card">
                    <div class="card-body">
                        <h5>% Gordura Corporal</h5>
                        <canvas id="gorduraChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
        <div class="card">
            <div class="card-body">
                <h5>Histórico</h5>
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

    // Gráfico de peso
    const ctxPeso = document.getElementById('pesoChart').getContext('2d');
    new Chart(ctxPeso, {
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
        options: { responsive: true }
    });

    // Gráfico de gordura
    const ctxGordura = document.getElementById('gorduraChart').getContext('2d');
    new Chart(ctxGordura, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '% Gordura',
                data: gorduraData,
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1
            }]
        },
        options: { responsive: true }
    });
}

// Agenda
async function loadAgenda() {
    try {
        const { data: consultas } = await supabase
            .from('fit_agenda')
            .select('*')
            .eq('aluno_id', currentAlunoId)
            .order('data_consulta', { ascending: true });

        if (!consultas || consultas.length === 0) {
            document.getElementById('agendaList').innerHTML = 
                '<div class="alert alert-info">Nenhuma consulta agendada.</div>';
            return;
        }

        renderAgenda(consultas);
    } catch (error) {
        console.error('Erro ao carregar agenda:', error);
    }
}

function renderAgenda(consultas) {
    const container = document.getElementById('agendaList');
    container.innerHTML = '<div class="list-group">';

    consultas.forEach(consulta => {
        const data = new Date(consulta.data_consulta);
        const isPast = data < new Date();
        
        container.innerHTML += `
            <div class="list-group-item ${isPast ? 'bg-light' : ''}">
                <div class="d-flex justify-content-between">
                    <h6>${consulta.tipo_consulta}</h6>
                    <span class="badge bg-${isPast ? 'secondary' : 'primary'}">
                        ${isPast ? 'Realizada' : consulta.status}
                    </span>
                </div>
                <p class="mb-1">
                    <i class="bi bi-calendar"></i> ${data.toLocaleDateString('pt-BR')} às 
                    ${data.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                </p>
                ${consulta.observacoes ? `<p class="mb-0 text-muted">${consulta.observacoes}</p>` : ''}
            </div>
        `;
    });

    container.innerHTML += '</div>';
}
