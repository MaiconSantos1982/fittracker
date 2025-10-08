// Aguardar o Supabase ser inicializado (ele vem do config.js)
let exercicioCounter = 0;
let exerciciosAdicionados = [];
let gruposMusculares = [];
let alunosDisponiveis = [];

// Carregar protocolos ao iniciar
document.addEventListener('DOMContentLoaded', function() {
    // Aguardar Supabase estar disponível
    setTimeout(() => {
        if (typeof supabase !== 'undefined') {
            carregarGruposMusculares();
            carregarAlunosProtocolo();
        }
    }, 500);
    
    // Configurar evento de mudança no objetivo
    const objetivoSelect = document.getElementById('objetivoProtocolo');
    const objetivoOutrosContainer = document.getElementById('objetivoOutrosContainer');
    
    if (objetivoSelect) {
        objetivoSelect.addEventListener('change', function() {
            if (this.value === 'outros') {
                objetivoOutrosContainer.style.display = 'block';
            } else {
                objetivoOutrosContainer.style.display = 'none';
            }
        });
    }
});

// Função para verificar quando entrar na seção de protocolos
document.addEventListener('click', function(e) {
    if (e.target.closest('[data-section="protocolos"]')) {
        setTimeout(() => {
            carregarProtocolos();
        }, 300);
    }
});

// Carregar grupos musculares
async function carregarGruposMusculares() {
    if (typeof supabase === 'undefined') {
        console.error('Supabase não está disponível ainda');
        return;
    }
    
    const { data, error } = await supabase
        .from('fit_grupos_musculares')
        .select('*')
        .order('ordem', { ascending: true });
    
    if (error) {
        console.error('Erro ao carregar grupos musculares:', error);
        return;
    }
    
    gruposMusculares = data || [];
}

// Carregar alunos do personal para o protocolo
async function carregarAlunosProtocolo() {
    if (typeof supabase === 'undefined') {
        console.error('Supabase não está disponível ainda');
        return;
    }
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.error('Usuário não autenticado');
            return;
        }
        
        const { data, error } = await supabase
            .from('fit_alunos')
            .select('id, nome')
            .eq('personal_id', user.id)
            .order('nome', { ascending: true });
        
        if (error) {
            console.error('Erro ao carregar alunos:', error);
            return;
        }
        
        alunosDisponiveis = data || [];
        renderizarSelectAlunosProtocolo();
    } catch (err) {
        console.error('Erro ao buscar alunos:', err);
    }
}

// Renderizar select de alunos no modal de protocolo
function renderizarSelectAlunosProtocolo() {
    const select = document.getElementById('alunoProtocolo');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione um aluno</option>' +
        alunosDisponiveis.map(aluno => `
            <option value="${aluno.id}">${aluno.nome}</option>
        `).join('');
}

// Carregar protocolos do banco
async function carregarProtocolos() {
    if (typeof supabase === 'undefined') {
        console.error('Supabase não está disponível ainda');
        return;
    }
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.error('Usuário não autenticado');
            return;
        }
        
        const { data, error } = await supabase
            .from('fit_protocolos')
            .select(`
                *,
                fit_alunos!inner(nome)
            `)
            .eq('personal_id', user.id)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Erro ao carregar protocolos:', error);
            return;
        }
        
        renderizarProtocolos(data || []);
    } catch (err) {
        console.error('Erro ao buscar protocolos:', err);
    }
}

// Renderizar cards de protocolos
function renderizarProtocolos(protocolos) {
    const container = document.getElementById('protocolosContainer');
    
    if (!container) return;
    
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
    if (typeof supabase === 'undefined') {
        console.error('Supabase não está disponível ainda');
        return [];
    }
    
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
    
    return data || [];
}

// Adicionar exercício dinamicamente
function adicionarExercicioProtocolo() {
    exercicioCounter++;
    const container = document.getElementById('exerciciosProtocoloContainer');
    
    if (!container) return;
    
    const gruposOptions = gruposMusculares.map(g => 
        `<option value="${g.id}">${g.nome}</option>`
    ).join('');
    
    const exercicioHTML = `
        <div class="card mb-3" id="exercicio-${exercicioCounter}">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="mb-0">Exercício ${exercicioCounter}</h6>
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick="removerExercicioProtocolo(${exercicioCounter})">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
                
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Grupo Muscular</label>
                        <select class="form-select" id="grupoMuscular-${exercicioCounter}">
                            <option value="">Selecione o grupo</option>
                            ${gruposOptions}
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Nome do Exercício</label>
                        <input type="text" class="form-control" id="nomeExercicio-${exercicioCounter}" required>
                        <input type="hidden" id="exercicioBibliotecaId-${exercicioCounter}">
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-3 mb-3">
                        <label class="form-label">Séries</label>
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

// Remover exercício
function removerExercicioProtocolo(id) {
    const exercicio = document.getElementById(`exercicio-${id}`);
    if (exercicio) {
        exercicio.remove();
        exerciciosAdicionados = exerciciosAdicionados.filter(e => e !== id);
    }
}

// Salvar protocolo no banco
async function salvarProtocolo() {
    if (typeof supabase === 'undefined') {
        alert('Sistema ainda carregando. Aguarde um momento.');
        return;
    }
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            alert('Você precisa estar logado');
            return;
        }
        
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
                exercicio_biblioteca_id: document.getElementById(`exercicioBibliotecaId-${id}`)?.value || null,
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
        const modalElement = document.getElementById('modalNovoProtocolo');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
        
        limparFormularioProtocolo();
        carregarProtocolos();
        
        alert('Protocolo salvo com sucesso!');
    } catch (err) {
        console.error('Erro geral ao salvar protocolo:', err);
        alert('Erro ao salvar protocolo: ' + err.message);
    }
}

// Limpar formulário
function limparFormularioProtocolo() {
    const form = document.getElementById('formProtocolo');
    if (form) {
        form.reset();
    }
    
    const container = document.getElementById('exerciciosProtocoloContainer');
    if (container) {
        container.innerHTML = '';
    }
    
    exercicioCounter = 0;
    exerciciosAdicionados = [];
}

// Excluir protocolo
async function excluirProtocolo(id) {
    if (!confirm('Deseja realmente excluir este protocolo? Todos os exercícios serão removidos.')) return;
    
    if (typeof supabase === 'undefined') {
        alert('Sistema ainda carregando. Aguarde um momento.');
        return;
    }
    
    try {
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
    } catch (err) {
        console.error('Erro ao excluir:', err);
        alert('Erro ao excluir protocolo');
    }
}

// Editar protocolo (funcionalidade futura)
function editarProtocolo(id) {
    alert('Funcionalidade de edição em desenvolvimento');
}
