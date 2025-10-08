// Inicializar Supabase
const supabase = supabase.createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_KEY');

let exercicioCounter = 0;
let exerciciosAdicionados = [];

// Carregar protocolos ao iniciar
document.addEventListener('DOMContentLoaded', function() {
    carregarGruposMusculares();
    carregarAlunos();
    carregarProtocolos();
});

let gruposMusculares = [];
let alunosDisponiveis = [];

// Carregar grupos musculares
async function carregarGruposMusculares() {
    const { data, error } = await supabase
        .from('fit_grupos_musculares')
        .select('*')
        .order('ordem', { ascending: true });
    
    if (error) {
        console.error('Erro ao carregar grupos musculares:', error);
        return;
    }
    
    gruposMusculares = data;
}

// Carregar alunos do personal
async function carregarAlunos() {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
        .from('fit_alunos')
        .select('id, nome')
        .eq('personal_id', user.id)
        .order('nome', { ascending: true });
    
    if (error) {
        console.error('Erro ao carregar alunos:', error);
        return;
    }
    
    alunosDisponiveis = data;
    renderizarSelectAlunos();
}

// Renderizar select de alunos no modal
function renderizarSelectAlunos() {
    const select = document.getElementById('alunoProtocolo');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione um aluno</option>' +
        alunosDisponiveis.map(aluno => `
            <option value="${aluno.id}">${aluno.nome}</option>
        `).join('');
}

// Carregar protocolos do banco
async function carregarProtocolos() {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
        .from('fit_protocolos')
        .select(`
            *,
            fit_alunos!inner(nome),
            fit_exercicios(count)
        `)
        .eq('personal_id', user.id)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Erro ao carregar protocolos:', error);
        return;
    }
    
    renderizarProtocolos(data);
}

// Renderizar cards de protocolos
function renderizarProtocolos(protocolos) {
    const container = document.getElementById('protocolosContainer');
    
    if (protocolos.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="bi bi-journal-text" style="font-size: 4rem; color: #ccc;"></i>
                <p class="text-muted mt-3">Nenhum protocolo cadastrado ainda</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = protocolos.map(protocolo => {
        const totalExercicios = protocolo.fit_exercicios?.[0]?.count || 0;
        const statusBadge = protocolo.ativo 
            ? '<span class="badge bg-success">Ativo</span>' 
            : '<span class="badge bg-secondary">Inativo</span>';
        
        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title">${protocolo.nome}</h5>
                        <p class="card-text text-muted small">
                            <strong>Aluno:</strong> ${protocolo.fit_alunos.nome}<br>
                            <strong>Objetivo:</strong> ${protocolo.objetivo}
                        </p>
                        ${statusBadge}
                        <span class="badge bg-secondary">${totalExercicios} exercícios</span>
                    </div>
                    <div class="card-footer bg-transparent">
                        <button class="btn btn-sm btn-outline-primary" onclick="editarProtocolo('${protocolo.id}')">
                            <i class="bi bi-pencil"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="excluirProtocolo('${protocolo.id}')">
                            <i class="bi bi-trash"></i> Excluir
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Buscar exercícios da biblioteca
async function buscarExerciciosBiblioteca(termo, grupoId = null) {
    let query = supabase
        .from('fit_exercicios_biblioteca')
        .select(`
            *,
            fit_grupos_musculares(nome)
        `)
        .ilike('nome', `%${termo}%`)
        .limit(10);
    
    if (grupoId) {
        query = query.eq('grupo_muscular_id', grupoId);
    }
    
    const { data, error } = await query;
    
    if (error) {
        console.error('Erro ao buscar exercícios:', error);
        return [];
    }
    
    return data;
}

// Adicionar exercício dinamicamente
function adicionarExercicio() {
    exercicioCounter++;
    const container = document.getElementById('exerciciosContainer');
    
    const gruposOptions = gruposMusculares.map(g => 
        `<option value="${g.id}">${g.nome}</option>`
    ).join('');
    
    const exercicioHTML = `
        <div class="card mb-3" id="exercicio-${exercicioCounter}">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="mb-0">Exercício ${exercicioCounter}</h6>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="removerExercicio(${exercicioCounter})">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
                
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Grupo Muscular</label>
                        <select class="form-select" id="grupoMuscular-${exercicioCounter}" onchange="filtrarExerciciosPorGrupo(${exercicioCounter})">
                            <option value="">Selecione o grupo</option>
                            ${gruposOptions}
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Buscar Exercício da Biblioteca</label>
                        <input type="text" class="form-control" id="buscaExercicio-${exercicioCounter}" 
                               placeholder="Digite para buscar..."
                               oninput="buscarExercicioNaBiblioteca(${exercicioCounter})">
                        <div id="resultadosBusca-${exercicioCounter}" class="list-group mt-2" style="max-height: 200px; overflow-y: auto;"></div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-12 mb-3">
                        <label class="form-label">Nome do Exercício</label>
                        <input type="text" class="form-control" id="nomeExercicio-${exercicioCounter}" required>
                        <input type="hidden" id="exercicioBibliotecaId-${exercicioCounter}">
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-3 mb-3">
                        <label class="form-label">Número de Séries</label>
                        <input type="number" class="form-control" id="numeroSeries-${exercicioCounter}" min="1" value="3">
                    </div>
                    <div class="col-md-3 mb-3">
                        <label class="form-label">Repetições</label>
                        <input type="text" class="form-control" id="repeticoes-${exercicioCounter}" placeholder="8-12">
                    </div>
                    <div class="col-md-3 mb-3">
                        <label class="form-label">Descanso (seg)</label>
                        <input type="number" class="form-control" id="descanso-${exercicioCounter}" min="0" value="60">
                    </div>
                    <div class="col-md-3 mb-3">
                        <label class="form-label">Ordem</label>
                        <input type="number" class="form-control" id="ordem-${exercicioCounter}" min="1" value="${exercicioCounter}">
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Método</label>
                        <select class="form-select" id="metodo-${exercicioCounter}">
                            <option value="normal">Normal</option>
                            <option value="drop_set">Drop Set</option>
                            <option value="bi_set">Bi Set</option>
                            <option value="tri_set">Tri Set</option>
                            <option value="superset">Superset</option>
                            <option value="rest_pause">Rest Pause</option>
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Objetivo</label>
                        <select class="form-select" id="objetivoExercicio-${exercicioCounter}">
                            <option value="hipertrofia">Hipertrofia</option>
                            <option value="forca">Força</option>
                            <option value="resistencia">Resistência</option>
                            <option value="explosao">Explosão</option>
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Vídeo URL (opcional)</label>
                        <input type="url" class="form-control" id="videoUrl-${exercicioCounter}" placeholder="https://...">
                    </div>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Dica/Observação</label>
                    <textarea class="form-control" id="dica-${exercicioCounter}" rows="2" placeholder="Técnica, cuidados, variações..."></textarea>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', exercicioHTML);
    exerciciosAdicionados.push(exercicioCounter);
}

// Buscar exercício na biblioteca em tempo real
async function buscarExercicioNaBiblioteca(counterId) {
    const termo = document.getElementById(`buscaExercicio-${counterId}`).value;
    const grupoId = document.getElementById(`grupoMuscular-${counterId}`).value;
    const resultadosDiv = document.getElementById(`resultadosBusca-${counterId}`);
    
    if (termo.length < 2) {
        resultadosDiv.innerHTML = '';
        return;
    }
    
    const exercicios = await buscarExerciciosBiblioteca(termo, grupoId || null);
    
    if (exercicios.length === 0) {
        resultadosDiv.innerHTML = '<div class="list-group-item text-muted">Nenhum exercício encontrado</div>';
        return;
    }
    
    resultadosDiv.innerHTML = exercicios.map(ex => `
        <button type="button" class="list-group-item list-group-item-action" 
                onclick="selecionarExercicioBiblioteca(${counterId}, '${ex.id}', '${ex.nome.replace(/'/g, "\\'")}', '${ex.grupo_muscular_id}', '${ex.video_url || ''}')">
            <strong>${ex.nome}</strong><br>
            <small class="text-muted">${ex.fit_grupos_musculares.nome}</small>
        </button>
    `).join('');
}

// Selecionar exercício da biblioteca
function selecionarExercicioBiblioteca(counterId, exercicioId, nome, grupoId, videoUrl) {
    document.getElementById(`nomeExercicio-${counterId}`).value = nome;
    document.getElementById(`exercicioBibliotecaId-${counterId}`).value = exercicioId;
    document.getElementById(`grupoMuscular-${counterId}`).value = grupoId;
    if (videoUrl && videoUrl !== 'null') {
        document.getElementById(`videoUrl-${counterId}`).value = videoUrl;
    }
    document.getElementById(`resultadosBusca-${counterId}`).innerHTML = '';
    document.getElementById(`buscaExercicio-${counterId}`).value = '';
}

// Remover exercício
function removerExercicio(id) {
    const exercicio = document.getElementById(`exercicio-${id}`);
    exercicio.remove();
    exerciciosAdicionados = exerciciosAdicionados.filter(e => e !== id);
}

// Salvar protocolo no banco
async function salvarProtocolo() {
    const { data: { user } } = await supabase.auth.getUser();
    
    const alunoId = document.getElementById('alunoProtocolo').value;
    const nome = document.getElementById('nomeProtocolo').value;
    const objetivo = document.getElementById('objetivoProtocolo').value;
    const objetivoOutros = document.getElementById('objetivoOutros')?.value || null;
    const dataInicio = document.getElementById('dataInicio')?.value || new Date().toISOString().split('T')[0];
    const dataFim = document.getElementById('dataFim')?.value || null;
    
    if (!nome || !alunoId) {
        alert('Por favor, preencha o nome do protocolo e selecione um aluno');
        return;
    }
    
    // Inserir protocolo
    const { data: protocolo, error: errorProtocolo } = await supabase
        .from('fit_protocolos')
        .insert({
            personal_id: user.id,
            aluno_id: alunoId,
            nome: nome,
            objetivo: objetivo,
            objetivo_outros: objetivoOutros,
            ativo: true,
            data_inicio: dataInicio,
            data_fim: dataFim
        })
        .select()
        .single();
    
    if (errorProtocolo) {
        console.error('Erro ao salvar protocolo:', errorProtocolo);
        alert('Erro ao salvar protocolo: ' + errorProtocolo.message);
        return;
    }
    
    // Coletar e inserir exercícios
    if (exerciciosAdicionados.length > 0) {
        const exercicios = exerciciosAdicionados.map(id => ({
            protocolo_id: protocolo.id,
            exercicio_biblioteca_id: document.getElementById(`exercicioBibliotecaId-${id}`).value || null,
            nome: document.getElementById(`nomeExercicio-${id}`).value,
            grupo_muscular: document.getElementById(`grupoMuscular-${id}`).value,
            repeticoes: document.getElementById(`repeticoes-${id}`).value,
            descanso: parseInt(document.getElementById(`descanso-${id}`).value) || 0,
            ordem: parseInt(document.getElementById(`ordem-${id}`).value) || id,
            metodo: document.getElementById(`metodo-${id}`).value || 'normal',
            objetivo_exercicio: document.getElementById(`objetivoExercicio-${id}`).value,
            video_url: document.getElementById(`videoUrl-${id}`).value || null,
            numero_series: parseInt(document.getElementById(`numeroSeries-${id}`).value) || 3,
            dica: document.getElementById(`dica-${id}`).value || null,
            series_detalhes: []
        }));
        
        const { error: errorExercicios } = await supabase
            .from('fit_exercicios')
            .insert(exercicios);
        
        if (errorExercicios) {
            console.error('Erro ao salvar exercícios:', errorExercicios);
            alert('Erro ao salvar exercícios: ' + errorExercicios.message);
            return;
        }
    }
    
    // Fechar modal e recarregar
    bootstrap.Modal.getInstance(document.getElementById('modalNovoProtocolo')).hide();
    limparFormulario();
    carregarProtocolos();
    
    alert('Protocolo salvo com sucesso!');
}

// Limpar formulário
function limparFormulario() {
    document.getElementById('formProtocolo').reset();
    document.getElementById('exerciciosContainer').innerHTML = '';
    exercicioCounter = 0;
    exerciciosAdicionados = [];
}

// Excluir protocolo
async function excluirProtocolo(id) {
    if (!confirm('Deseja realmente excluir este protocolo? Todos os exercícios serão removidos.')) return;
    
    const { error } = await supabase
        .from('fit_protocolos')
        .delete()
        .eq('id', id);
    
    if (error) {
        console.error('Erro ao excluir protocolo:', error);
        alert('Erro ao excluir protocolo');
        return;
    }
    
    alert('Protocolo excluído com sucesso!');
    carregarProtocolos();
}
