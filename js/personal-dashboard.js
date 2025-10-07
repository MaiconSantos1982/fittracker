// Exemplo de atualizações necessárias:

// Dashboard Data
async function loadDashboardData() {
    try {
        // Total de alunos
        const { data: alunos, error: alunosError } = await supabase
            .from('fit_alunos') // ATUALIZADO
            .select('*', { count: 'exact' })
            .eq('personal_id', currentUser.id);

        if (!alunosError) {
            document.getElementById('totalAlunos').textContent = alunos.length;
            document.getElementById('alunosAtivos').textContent = alunos.filter(a => a.ativo).length;
        }

        // Total de treinos
        const { data: treinos } = await supabase
            .from('fit_treinos') // ATUALIZADO
            .select('*', { count: 'exact' })
            .eq('personal_id', currentUser.id);

        if (treinos) {
            document.getElementById('totalTreinos').textContent = treinos.length;
        }

        // Consultas hoje
        const today = new Date().toISOString().split('T')[0];
        const { data: consultas } = await supabase
            .from('fit_agenda') // ATUALIZADO
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

// CRUD Alunos
async function loadAlunos() {
    try {
        const { data, error } = await supabase
            .from('fit_alunos') // ATUALIZADO
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

        currentAlunos = data;
        renderAlunosTable(data);
    } catch (error) {
        console.error('Erro ao carregar alunos:', error);
    }
}

async function saveAluno() {
    try {
        const email = document.getElementById('alunoEmail').value;
        
        // Buscar usuário pelo email
        const { data: profile } = await supabase
            .from('fit_profiles') // ATUALIZADO
            .select('id')
            .eq('email', email)
            .eq('user_type', 'aluno')
            .single();

        if (!profile) {
            alert('Aluno não encontrado com este email. O aluno precisa estar cadastrado no sistema.');
            return;
        }

        const alunoData = {
            personal_id: currentUser.id,
            profile_id: profile.id,
            data_nascimento: document.getElementById('alunoDataNasc').value,
            objetivo: document.getElementById('alunoObjetivo').value,
            observacoes: document.getElementById('alunoObs').value,
            ativo: true
        };

        const { error } = await supabase
            .from('fit_alunos') // ATUALIZADO
            .insert(alunoData);

        if (error) throw error;

        alert('Aluno cadastrado com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('alunoModal')).hide();
        loadAlunos();
        loadAlunoSelects();
    } catch (error) {
        console.error('Erro ao salvar aluno:', error);
        alert('Erro ao salvar aluno: ' + error.message);
    }
}

async function deleteAluno(alunoId) {
    if (!confirm('Tem certeza que deseja excluir este aluno?')) return;

    try {
        const { error } = await supabase
            .from('fit_alunos') // ATUALIZADO
            .delete()
            .eq('id', alunoId);

        if (error) throw error;

        alert('Aluno excluído com sucesso!');
        loadAlunos();
    } catch (error) {
        console.error('Erro ao excluir aluno:', error);
        alert('Erro ao excluir aluno: ' + error.message);
    }
}

// Carregar selects de alunos
async function loadAlunoSelects() {
    const { data: alunos } = await supabase
        .from('fit_alunos') // ATUALIZADO
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
        if (select && selectId !== 'notifDestinatarios') {
            select.innerHTML = '<option value="">Selecione...</option>';
            alunos?.forEach(aluno => {
                select.innerHTML += `<option value="${aluno.id}">${aluno.profile?.full_name}</option>`;
            });
        } else if (select && selectId === 'notifDestinatarios') {
            alunos?.forEach(aluno => {
                select.innerHTML += `<option value="${aluno.profile_id}">${aluno.profile?.full_name}</option>`;
            });
        }
    });
}

// CRUD Treinos
async function saveTreino() {
    try {
        const alunoId = document.getElementById('treinoAluno').value;
        const nome = document.getElementById('treinoNome').value;
        const descricao = document.getElementById('treinoDesc').value;

        // Criar treino
        const { data: treino, error: treinoError } = await supabase
            .from('fit_treinos') // ATUALIZADO
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

            await supabase.from('fit_exercicios').insert({ // ATUALIZADO
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
    } catch (error) {
        console.error('Erro ao salvar treino:', error);
        alert('Erro ao salvar treino: ' + error.message);
    }
}

// CRUD Dietas
async function saveDieta() {
    try {
        const alunoId = document.getElementById('dietaAluno').value;
        const nome = document.getElementById('dietaNome').value;
        const descricao = document.getElementById('dietaDesc').value;
        const dataInicio = document.getElementById('dietaInicio').value;
        const dataFim = document.getElementById('dietaFim').value;

        // Criar dieta
        const { data: dieta, error: dietaError } = await supabase
            .from('fit_dietas') // ATUALIZADO
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

            await supabase.from('fit_refeicoes').insert({ // ATUALIZADO
                dieta_id: dieta.id,
                tipo_refeicao: tipo,
                horario: horario,
                alimentos: alimentos,
                observacoes: obs
            });
        }

        alert('Dieta criada com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('dietaModal')).hide();
        loadDietas();
    } catch (error) {
        console.error('Erro ao salvar dieta:', error);
        alert('Erro ao salvar dieta: ' + error.message);
    }
}

// Medidas
async function saveMedida() {
    try {
        const medidaData = {
            aluno_id: document.getElementById('medidaAluno').value,
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
            .from('fit_medidas') // ATUALIZADO
            .insert(medidaData);

        if (error) throw error;

        alert('Medidas registradas com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('medidaModal')).hide();
        loadMedidas();
    } catch (error) {
        console.error('Erro ao salvar medidas:', error);
        alert('Erro ao salvar medidas: ' + error.message);
    }
}

async function loadMedidas() {
    const alunoId = document.getElementById('alunoMedidasSelect').value;
    if (!alunoId) return;

    try {
        const { data: medidas, error } = await supabase
            .from('fit_medidas') // ATUALIZADO
            .select('*')
            .eq('aluno_id', alunoId)
            .order('data_medicao', { ascending: false });

        if (error) throw error;

        renderMedidasChart(medidas);
    } catch (error) {
        console.error('Erro ao carregar medidas:', error);
    }
}

// Agenda
async function saveAgenda() {
    try {
        const agendaData = {
            personal_id: currentUser.id,
            aluno_id: document.getElementById('agendaAluno').value,
            data_consulta: document.getElementById('agendaDataHora').value,
            tipo_consulta: document.getElementById('agendaTipo').value,
            observacoes: document.getElementById('agendaObs').value,
            status: 'agendada'
        };

        const { error } = await supabase
            .from('fit_agenda') // ATUALIZADO
            .insert(agendaData);

        if (error) throw error;

        alert('Consulta agendada com sucesso!');
        bootstrap.Modal.getInstance(document.getElementById('agendaModal')).hide();
        loadAgenda();
    } catch (error) {
        console.error('Erro ao salvar agenda:', error);
        alert('Erro ao agendar consulta: ' + error.message);
    }
}

async function loadAgenda() {
    try {
        const { data: consultas, error } = await supabase
            .from('fit_agenda') // ATUALIZADO
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

// Notificações Push
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
                .from('fit_push_subscriptions') // ATUALIZADO
                .select('player_id')
                .in('user_id', currentAlunos.map(a => a.profile_id));
            
            playerIds = subs.map(s => s.player_id);
        } else {
            const { data: subs } = await supabase
                .from('fit_push_subscriptions') // ATUALIZADO
                .select('player_id')
                .in('user_id', destinatarios);
            
            playerIds = subs.map(s => s.player_id);
        }

        // Enviar notificação via OneSignal REST API
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic YOUR_ONESIGNAL_REST_API_KEY'
            },
            body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                include_player_ids: playerIds,
                headings: { en: titulo },
                contents: { en: mensagem }
            })
        });

        if (response.ok) {
            alert('Notificação enviada com sucesso!');
            document.getElementById('notificationForm').reset();
        } else {
            throw new Error('Erro ao enviar notificação');
        }
    } catch (error) {
        console.error('Erro ao enviar notificação:', error);
        alert('Erro ao enviar notificação: ' + error.message);
    }
});
