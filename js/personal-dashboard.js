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
