// Importa as funções necessárias do Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Credenciais Supabase (substitua com as suas, se diferentes)
// O snippet anterior do usuário já tinha esses valores, então os manterei.
const SUPABASE_URL = 'https://umpufxwgaxgyhzhbjaep.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtcHVmeHdnYXgyaHpoYmphZXAubnF3dGouY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE3NjY0NDEsImV4cCI6MTczNzYwNjQ0MX0.yYw259mE3-wR3i1sTz620_R60x_r09b1P4n33nB7m-s'; // Substitua pela sua chave anon public

// Inicializa o cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variáveis globais para armazenar o estado do usuário e dados
let currentUser = null;
let userProfile = null;
let currentUserId = null; // Para armazenar o ID do usuário Supabase

// --- Funções de UI (Modal de Mensagem) ---
const messageModal = document.getElementById('messageModal');
const modalMessage = document.getElementById('modalMessage');
const modalButtons = messageModal ? messageModal.querySelector('.modal-buttons') : null;

window.showMessageModal = (message, isConfirm = false, onConfirm = null) => {
    if (!messageModal || !modalMessage || !modalButtons) {
        console.error('Modal elements not found.');
        return;
    }
    modalMessage.textContent = message;
    modalButtons.innerHTML = ''; // Limpa botões anteriores

    const okButton = document.createElement('button');
    okButton.textContent = 'OK';
    okButton.className = 'modal-button';
    okButton.onclick = window.closeModal;
    modalButtons.appendChild(okButton);

    if (isConfirm) {
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancelar';
        cancelButton.className = 'modal-button modal-button-cancel ml-2'; // Adiciona margem
        cancelButton.onclick = window.closeModal;
        modalButtons.appendChild(cancelButton);

        okButton.onclick = () => {
            onConfirm();
            window.closeModal();
        };
    }

    messageModal.style.display = 'flex'; // Usa flex para centralizar
};

window.closeModal = () => {
    if (messageModal) {
        messageModal.style.display = 'none';
    }
};

// --- Funções de Autenticação e Perfil de Usuário ---

/**
 * Atualiza a visibilidade dos controles de supervisor com base na função do usuário.
 */
function updateSupervisorControlsVisibility() {
    const supervisorElements = document.querySelectorAll('[data-role="supervisor"]');
    if (userProfile && userProfile.role === 'supervisor') {
        supervisorElements.forEach(el => el.style.display = 'block');
    } else {
        supervisorElements.forEach(el => el.style.display = 'none');
    }
}

/**
 * Carrega o perfil do usuário logado.
 * @param {string} userId O ID do usuário do Supabase Auth.
 */
async function loadUserProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found (profile doesn't exist yet)
            throw error;
        }

        if (data) {
            userProfile = data;
            document.getElementById('user-name').textContent = userProfile.name || 'Nome Desconhecido';
            document.getElementById('user-role').textContent = userProfile.role || 'Cargo Desconhecido';
            document.getElementById('user-avatar').src = userProfile.avatar_url || 'https://via.placeholder.com/32/FFD700/000000?text=JD';
        } else {
            // Se o perfil não existir, cria um perfil básico
            await createInitialUserProfile(userId);
        }
        updateSupervisorControlsVisibility();
    } catch (error) {
        console.error('Erro ao carregar perfil do usuário:', error.message);
        window.showMessageModal(`Erro ao carregar perfil: ${error.message}`);
    }
}

/**
 * Cria um perfil inicial para um novo usuário.
 * @param {string} userId O ID do usuário do Supabase Auth.
 */
async function createInitialUserProfile(userId) {
    try {
        const newProfile = {
            user_id: userId,
            name: `Usuário ${userId.substring(0, 8)}`, // Nome padrão
            role: 'colaborador', // Cargo padrão
            avatar_url: 'https://via.placeholder.com/32/FFD700/000000?text=JD'
        };
        const { data, error } = await supabase
            .from('user_profiles')
            .insert([newProfile]);

        if (error) throw error;

        userProfile = newProfile; // Define o perfil recém-criado
        document.getElementById('user-name').textContent = userProfile.name;
        document.getElementById('user-role').textContent = userProfile.role;
        document.getElementById('user-avatar').src = userProfile.avatar_url;
        updateSupervisorControlsVisibility();
        window.showMessageModal('Seu perfil foi criado automaticamente. Você pode editá-lo na seção "Meu Perfil".');
    } catch (error) {
        console.error('Erro ao criar perfil inicial:', error.message);
        window.showMessageModal(`Erro ao criar perfil inicial: ${error.message}`);
    }
}

/**
 * Lida com o estado da autenticação do Supabase.
 */
supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
        currentUser = session.user;
        currentUserId = currentUser.id;
        console.log('Usuário logado:', currentUserId);
        await loadUserProfile(currentUserId);
        // Redireciona para o dashboard se estiver na página de login
        if (window.location.pathname.endsWith('login.html') || window.location.pathname === '/') {
            window.location.href = 'index.html';
        }
    } else {
        currentUser = null;
        currentUserId = null;
        userProfile = null;
        console.log('Usuário deslogado.');
        // Redireciona para a página de login se não estiver logado e não estiver na página de login
        if (!window.location.pathname.endsWith('login.html')) {
            window.location.href = 'login.html';
        }
    }
    updateSupervisorControlsVisibility(); // Atualiza visibilidade ao mudar o estado de auth
});

// Função de Logout
window.handleLogout = async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        window.showMessageModal('Deslogado com sucesso!');
        // onAuthStateChange lidará com o redirecionamento
    } catch (error) {
        console.error('Erro ao deslogar:', error.message);
        window.showMessageModal(`Erro ao deslogar: ${error.message}`);
    }
};

// Adiciona o listener ao botão de logout
document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', window.handleLogout);
    }
});

// --- Funções de Carregamento de Dados para o Dashboard ---

/**
 * Carrega e exibe notas pessoais do Supabase.
 */
async function loadPersonalNotes() {
    const personalNotesList = document.getElementById('personal-notes-list');
    if (!personalNotesList || !currentUserId) return; // Garante que o elemento existe e o usuário está logado

    try {
        const { data: notes, error } = await supabase
            .from('personal_notes')
            .select('*')
            .eq('user_id', currentUserId)
            .order('created_at', { ascending: false }); // Ordena por data de criação

        if (error) throw error;

        personalNotesList.innerHTML = ''; // Limpa a lista antes de adicionar
        if (notes.length === 0) {
            personalNotesList.innerHTML = '<li class="text-zinc-500">Nenhuma anotação pessoal ainda.</li>';
            return;
        }

        notes.forEach(note => {
            const li = document.createElement('li');
            li.className = 'flex items-center justify-between bg-zinc-800 p-3 rounded-lg mb-2 shadow-inner';
            li.setAttribute('data-note-id', note.id); // Armazena o ID do documento
            li.innerHTML = `
                <p class="flex-grow text-white">${note.content}</p>
                <div class="flex-shrink-0 ml-4">
                    <button class="btn btn-edit btn-yellow text-sm py-1 px-2 mr-2" onclick="window.handleEditPersonalNote('${note.id}', '${note.content.replace(/'/g, "\\'")}')">Editar</button>
                    <button class="btn btn-delete text-sm py-1 px-2" onclick="window.handleDeletePersonalNote('${note.id}')">Excluir</button>
                </div>
            `;
            personalNotesList.appendChild(li);
        });
    } catch (error) {
        console.error('Erro ao carregar anotações pessoais:', error.message);
        personalNotesList.innerHTML = `<li class="text-red-400">Erro ao carregar anotações: ${error.message}</li>`;
    }
}

/**
 * Adiciona uma nova anotação pessoal.
 */
window.handleAddPersonalNote = async () => {
    const newNoteInput = document.getElementById('new-personal-note');
    if (!newNoteInput || !currentUserId) return;

    const content = newNoteInput.value.trim();
    if (!content) {
        window.showMessageModal('Por favor, digite o conteúdo da anotação.');
        return;
    }

    try {
        const { error } = await supabase
            .from('personal_notes')
            .insert([{ user_id: currentUserId, content: content }]);

        if (error) throw error;

        newNoteInput.value = ''; // Limpa o input
        window.showMessageModal('Anotação adicionada com sucesso!');
        await loadPersonalNotes(); // Recarrega a lista
    } catch (error) {
        console.error('Erro ao adicionar anotação pessoal:', error.message);
        window.showMessageModal(`Erro ao adicionar anotação: ${error.message}`);
    }
};

/**
 * Edita uma anotação pessoal existente.
 * @param {string} noteId O ID da anotação.
 * @param {string} currentContent O conteúdo atual da anotação.
 */
window.handleEditPersonalNote = (noteId, currentContent) => {
    window.showMessageModal('Editar Anotação:', true, async () => {
        const newContent = prompt('Digite o novo conteúdo da anotação:', currentContent);
        if (newContent && newContent.trim() !== '') {
            try {
                const { error } = await supabase
                    .from('personal_notes')
                    .update({ content: newContent.trim() })
                    .eq('id', noteId);

                if (error) throw error;

                window.showMessageModal('Anotação atualizada com sucesso!');
                await loadPersonalNotes(); // Recarrega a lista
            } catch (error) {
                console.error('Erro ao atualizar anotação pessoal:', error.message);
                window.showMessageModal(`Erro ao atualizar anotação: ${error.message}`);
            }
        } else if (newContent !== null) { // Se o usuário digitou vazio e não cancelou
            window.showMessageModal('O conteúdo da anotação não pode ser vazio.');
        }
    });
};

/**
 * Exclui uma anotação pessoal.
 * @param {string} noteId O ID da anotação a ser excluída.
 */
window.handleDeletePersonalNote = (noteId) => {
    window.showMessageModal('Tem certeza que deseja excluir esta anotação?', true, async () => {
        try {
            const { error } = await supabase
                .from('personal_notes')
                .delete()
                .eq('id', noteId);

            if (error) throw error;

            window.showMessageModal('Anotação excluída com sucesso!');
            await loadPersonalNotes(); // Recarrega a lista
        } catch (error) {
            console.error('Erro ao excluir anotação pessoal:', error.message);
            window.showMessageModal(`Erro ao excluir anotação: ${error.message}`);
        }
    });
};

/**
 * Carrega e exibe os prompts do Supabase.
 */
async function loadPrompts() {
    const promptsList = document.getElementById('prompts-list');
    if (!promptsList) return;

    try {
        const { data: prompts, error } = await supabase
            .from('prompts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        promptsList.innerHTML = '';
        if (prompts.length === 0) {
            promptsList.innerHTML = '<li class="text-zinc-500">Nenhum prompt disponível ainda.</li>';
            return;
        }

        prompts.forEach(prompt => {
            const li = document.createElement('li');
            li.className = 'flex items-start justify-between bg-zinc-800 p-3 rounded-lg mb-2 shadow-inner';
            li.setAttribute('data-prompt-id', prompt.id);
            li.innerHTML = `
                <div class="flex-grow">
                    <p class="font-semibold text-yellow-custom">${prompt.title}</p>
                    <p class="text-white text-sm mt-1">${prompt.content}</p>
                    ${prompt.category ? `<p class="text-zinc-500 text-xs mt-1">Categoria: ${prompt.category}</p>` : ''}
                </div>
                ${userProfile && userProfile.role === 'supervisor' ? `
                <div class="flex-shrink-0 ml-4 flex items-center">
                    <button class="btn btn-edit btn-yellow text-sm py-1 px-2 mr-2" onclick="window.handleEditPrompt('${prompt.id}', '${prompt.title.replace(/'/g, "\\'")}', '${prompt.content.replace(/'/g, "\\'")}', '${prompt.category ? prompt.category.replace(/'/g, "\\'") : ''}')">Editar</button>
                    <button class="btn btn-delete text-sm py-1 px-2" onclick="window.handleDeletePrompt('${prompt.id}')">Excluir</button>
                </div>
                ` : ''}
            `;
            promptsList.appendChild(li);
        });
    } catch (error) {
        console.error('Erro ao carregar prompts:', error.message);
        promptsList.innerHTML = `<li class="text-red-400">Erro ao carregar prompts: ${error.message}</li>`;
    }
}

/**
 * Adiciona um novo prompt. (Supervisor only)
 */
window.handleAddPrompt = async () => {
    if (userProfile && userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para adicionar prompts.');
        return;
    }

    const title = prompt('Título do Prompt:');
    if (!title || title.trim() === '') {
        if (title !== null) window.showMessageModal('O título do prompt não pode ser vazio.');
        return;
    }

    const content = prompt('Conteúdo do Prompt:');
    if (!content || content.trim() === '') {
        if (content !== null) window.showMessageModal('O conteúdo do prompt não pode ser vazio.');
        return;
    }

    const category = prompt('Categoria (opcional):');

    try {
        const { error } = await supabase
            .from('prompts')
            .insert([{ title: title.trim(), content: content.trim(), category: category ? category.trim() : null }]);

        if (error) throw error;

        window.showMessageModal('Prompt adicionado com sucesso!');
        await loadPrompts();
    } catch (error) {
        console.error('Erro ao adicionar prompt:', error.message);
        window.showMessageModal(`Erro ao adicionar prompt: ${error.message}`);
    }
};

/**
 * Edita um prompt existente. (Supervisor only)
 */
window.handleEditPrompt = (promptId, currentTitle, currentContent, currentCategory) => {
    if (userProfile && userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para editar prompts.');
        return;
    }

    window.showMessageModal('Editar Prompt:', true, async () => {
        const newTitle = prompt('Novo Título:', currentTitle);
        if (!newTitle || newTitle.trim() === '') {
            if (newTitle !== null) window.showMessageModal('O título não pode ser vazio.');
            return;
        }

        const newContent = prompt('Novo Conteúdo:', currentContent);
        if (!newContent || newContent.trim() === '') {
            if (newContent !== null) window.showMessageModal('O conteúdo não pode ser vazio.');
            return;
        }

        const newCategory = prompt('Nova Categoria (opcional):', currentCategory);

        try {
            const { error } = await supabase
                .from('prompts')
                .update({
                    title: newTitle.trim(),
                    content: newContent.trim(),
                    category: newCategory ? newCategory.trim() : null
                })
                .eq('id', promptId);

            if (error) throw error;

            window.showMessageModal('Prompt atualizado com sucesso!');
            await loadPrompts();
        } catch (error) {
            console.error('Erro ao atualizar prompt:', error.message);
            window.showMessageModal(`Erro ao atualizar prompt: ${error.message}`);
        }
    });
};

/**
 * Exclui um prompt. (Supervisor only)
 */
window.handleDeletePrompt = (promptId) => {
    if (userProfile && userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para excluir prompts.');
        return;
    }

    window.showMessageModal('Tem certeza que deseja excluir este prompt?', true, async () => {
        try {
            const { error } = await supabase
                .from('prompts')
                .delete()
                .eq('id', promptId);

            if (error) throw error;

            window.showMessageModal('Prompt excluído com sucesso!');
            await loadPrompts();
        } catch (error) {
            console.error('Erro ao excluir prompt:', error.message);
            window.showMessageModal(`Erro ao excluir prompt: ${error.message}`);
        }
    });
};

/**
 * Carrega e exibe os aprendizados/casos técnicos.
 */
async function loadLearnings() {
    const learningsList = document.getElementById('learnings-list');
    if (!learningsList) return;

    try {
        const { data: learnings, error } = await supabase
            .from('learnings')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        learningsList.innerHTML = '';
        if (learnings.length === 0) {
            learningsList.innerHTML = '<li class="text-zinc-500">Nenhum aprendizado ou caso técnico registrado ainda.</li>';
            return;
        }

        learnings.forEach(learning => {
            const li = document.createElement('li');
            li.className = 'flex items-start justify-between bg-zinc-800 p-3 rounded-lg mb-2 shadow-inner';
            li.setAttribute('data-learning-id', learning.id);
            li.innerHTML = `
                <div class="flex-grow">
                    <p class="font-semibold text-yellow-custom">${learning.title}</p>
                    <p class="text-white text-sm mt-1">${learning.description}</p>
                    ${learning.category ? `<p class="text-zinc-500 text-xs mt-1">Categoria: ${learning.category}</p>` : ''}
                </div>
                ${userProfile && userProfile.role === 'supervisor' ? `
                <div class="flex-shrink-0 ml-4 flex items-center">
                    <button class="btn btn-edit btn-yellow text-sm py-1 px-2 mr-2" onclick="window.handleEditLearning('${learning.id}', '${learning.title.replace(/'/g, "\\'")}', '${learning.description.replace(/'/g, "\\'")}', '${learning.category ? learning.category.replace(/'/g, "\\'") : ''}')">Editar</button>
                    <button class="btn btn-delete text-sm py-1 px-2" onclick="window.handleDeleteLearning('${learning.id}')">Excluir</button>
                </div>
                ` : ''}
            `;
            learningsList.appendChild(li);
        });
    } catch (error) {
        console.error('Erro ao carregar aprendizados:', error.message);
        learningsList.innerHTML = `<li class="text-red-400">Erro ao carregar aprendizados: ${error.message}</li>`;
    }
}

/**
 * Adiciona um novo aprendizado/caso técnico. (Supervisor only)
 */
window.handleAddLearning = async () => {
    if (userProfile && userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para adicionar aprendizados.');
        return;
    }

    const title = prompt('Título do Aprendizado/Caso Técnico:');
    if (!title || title.trim() === '') {
        if (title !== null) window.showMessageModal('O título não pode ser vazio.');
        return;
    }

    const description = prompt('Descrição do Aprendizado/Caso Técnico:');
    if (!description || description.trim() === '') {
        if (description !== null) window.showMessageModal('A descrição não pode ser vazia.');
        return;
    }

    const category = prompt('Categoria (opcional):');

    try {
        const { error } = await supabase
            .from('learnings')
            .insert([{ title: title.trim(), description: description.trim(), category: category ? category.trim() : null }]);

        if (error) throw error;

        window.showMessageModal('Aprendizado/Caso Técnico adicionado com sucesso!');
        await loadLearnings();
    } catch (error) {
        console.error('Erro ao adicionar aprendizado:', error.message);
        window.showMessageModal(`Erro ao adicionar aprendizado: ${error.message}`);
    }
};

/**
 * Edita um aprendizado/caso técnico existente. (Supervisor only)
 */
window.handleEditLearning = (learningId, currentTitle, currentDescription, currentCategory) => {
    if (userProfile && userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para editar aprendizados.');
        return;
    }

    window.showMessageModal('Editar Aprendizado/Caso Técnico:', true, async () => {
        const newTitle = prompt('Novo Título:', currentTitle);
        if (!newTitle || newTitle.trim() === '') {
            if (newTitle !== null) window.showMessageModal('O título não pode ser vazio.');
            return;
        }

        const newDescription = prompt('Nova Descrição:', currentDescription);
        if (!newDescription || newDescription.trim() === '') {
            if (newDescription !== null) window.showMessageModal('A descrição não pode ser vazia.');
            return;
        }

        const newCategory = prompt('Nova Categoria (opcional):', currentCategory);

        try {
            const { error } = await supabase
                .from('learnings')
                .update({
                    title: newTitle.trim(),
                    description: newDescription.trim(),
                    category: newCategory ? newCategory.trim() : null
                })
                .eq('id', learningId);

            if (error) throw error;

            window.showMessageModal('Aprendizado/Caso Técnico atualizado com sucesso!');
            await loadLearnings();
        } catch (error) {
            console.error('Erro ao atualizar aprendizado:', error.message);
            window.showMessageModal(`Erro ao atualizar aprendizado: ${error.message}`);
        }
    });
};

/**
 * Exclui um aprendizado/caso técnico. (Supervisor only)
 */
window.handleDeleteLearning = (learningId) => {
    if (userProfile && userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para excluir aprendizados.');
        return;
    }

    window.showMessageModal('Tem certeza que deseja excluir este aprendizado/caso técnico?', true, async () => {
        try {
            const { error } = await supabase
                .from('learnings')
                .delete()
                .eq('id', learningId);

            if (error) throw error;

            window.showMessageModal('Aprendizado/Caso Técnico excluído com sucesso!');
            await loadLearnings();
        } catch (error) {
            console.error('Erro ao excluir aprendizado:', error.message);
            window.showMessageModal(`Erro ao excluir aprendizado: ${error.message}`);
        }
    });
};

/**
 * Carrega e exibe os alinhamentos da equipe.
 */
async function loadAlignments() {
    const alignmentsList = document.getElementById('alignments-list');
    if (!alignmentsList) return;

    try {
        const { data: alignments, error } = await supabase
            .from('alignments')
            .select('*')
            .order('date', { ascending: false }); // Ordena por data

        if (error) throw error;

        alignmentsList.innerHTML = '';
        if (alignments.length === 0) {
            alignmentsList.innerHTML = '<li class="text-zinc-500">Nenhum alinhamento registrado ainda.</li>';
            return;
        }

        alignments.forEach(alignment => {
            const li = document.createElement('li');
            li.className = 'flex items-start justify-between bg-zinc-800 p-3 rounded-lg mb-2 shadow-inner';
            li.setAttribute('data-alignment-id', alignment.id);
            li.innerHTML = `
                <div class="flex-grow">
                    <p class="font-semibold text-yellow-custom">${alignment.title}</p>
                    <p class="text-white text-sm mt-1">${alignment.description}</p>
                    <p class="text-zinc-500 text-xs mt-1">Data: ${new Date(alignment.date).toLocaleDateString('pt-BR')}</p>
                </div>
                ${userProfile && userProfile.role === 'supervisor' ? `
                <div class="flex-shrink-0 ml-4 flex items-center">
                    <button class="btn btn-edit btn-yellow text-sm py-1 px-2 mr-2" onclick="window.handleEditAlignment('${alignment.id}', '${alignment.title.replace(/'/g, "\\'")}', '${alignment.description.replace(/'/g, "\\'")}', '${alignment.date}')">Editar</button>
                    <button class="btn btn-delete text-sm py-1 px-2" onclick="window.handleDeleteAlignment('${alignment.id}')">Excluir</button>
                </div>
                ` : ''}
            `;
            alignmentsList.appendChild(li);
        });
    } catch (error) {
        console.error('Erro ao carregar alinhamentos:', error.message);
        alignmentsList.innerHTML = `<li class="text-red-400">Erro ao carregar alinhamentos: ${error.message}</li>`;
    }
}

/**
 * Adiciona um novo alinhamento. (Supervisor only)
 */
window.handleAddAlignment = async () => {
    if (userProfile && userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para adicionar alinhamentos.');
        return;
    }

    const title = prompt('Título do Alinhamento:');
    if (!title || title.trim() === '') {
        if (title !== null) window.showMessageModal('O título não pode ser vazio.');
        return;
    }

    const description = prompt('Descrição do Alinhamento:');
    if (!description || description.trim() === '') {
        if (description !== null) window.showMessageModal('A descrição não pode ser vazia.');
        return;
    }

    const date = prompt('Data do Alinhamento (AAAA-MM-DD):');
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        if (date !== null) window.showMessageModal('Por favor, insira uma data válida no formato AAAA-MM-DD.');
        return;
    }

    try {
        const { error } = await supabase
            .from('alignments')
            .insert([{ title: title.trim(), description: description.trim(), date: date }]);

        if (error) throw error;

        window.showMessageModal('Alinhamento adicionado com sucesso!');
        await loadAlignments();
    } catch (error) {
        console.error('Erro ao adicionar alinhamento:', error.message);
        window.showMessageModal(`Erro ao adicionar alinhamento: ${error.message}`);
    }
};

/**
 * Edita um alinhamento existente. (Supervisor only)
 */
window.handleEditAlignment = (alignmentId, currentTitle, currentDescription, currentDate) => {
    if (userProfile && userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para editar alinhamentos.');
        return;
    }

    window.showMessageModal('Editar Alinhamento:', true, async () => {
        const newTitle = prompt('Novo Título:', currentTitle);
        if (!newTitle || newTitle.trim() === '') {
            if (newTitle !== null) window.showMessageModal('O título não pode ser vazio.');
            return;
        }

        const newDescription = prompt('Nova Descrição:', currentDescription);
        if (!newDescription || newDescription.trim() === '') {
            if (newDescription !== null) window.showMessageModal('A descrição não pode ser vazia.');
            return;
        }

        const newDate = prompt('Nova Data (AAAA-MM-DD):', currentDate);
        if (!newDate || !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
            if (newDate !== null) window.showMessageModal('Por favor, insira uma data válida no formato AAAA-MM-DD.');
            return;
        }

        try {
            const { error } = await supabase
                .from('alignments')
                .update({
                    title: newTitle.trim(),
                    description: newDescription.trim(),
                    date: newDate
                })
                .eq('id', alignmentId);

            if (error) throw error;

            window.showMessageModal('Alinhamento atualizado com sucesso!');
            await loadAlignments();
        } catch (error) {
            console.error('Erro ao atualizar alinhamento:', error.message);
            window.showMessageModal(`Erro ao atualizar alinhamento: ${error.message}`);
        }
    });
};

/**
 * Exclui um alinhamento. (Supervisor only)
 */
window.handleDeleteAlignment = (alignmentId) => {
    if (userProfile && userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para excluir alinhamentos.');
        return;
    }

    window.showMessageModal('Tem certeza que deseja excluir este alinhamento?', true, async () => {
        try {
            const { error } = await supabase
                .from('alignments')
                .delete()
                .eq('id', alignmentId);

            if (error) throw error;

            window.showMessageModal('Alinhamento excluído com sucesso!');
            await loadAlignments();
        } catch (error) {
            console.error('Erro ao excluir alinhamento:', error.message);
            window.showMessageModal(`Erro ao excluir alinhamento: ${error.message}`);
        }
    });
};

/**
 * Carrega e exibe as metas.
 */
async function loadGoals() {
    const goalsList = document.getElementById('goals-list');
    if (!goalsList) return;

    try {
        const { data: goals, error } = await supabase
            .from('goals')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        goalsList.innerHTML = '';
        if (goals.length === 0) {
            goalsList.innerHTML = '<li class="text-zinc-500">Nenhuma meta registrada ainda.</li>';
            return;
        }

        goals.forEach(goal => {
            const li = document.createElement('li');
            li.className = 'flex items-start justify-between bg-zinc-800 p-3 rounded-lg mb-2 shadow-inner';
            li.setAttribute('data-goal-id', goal.id);
            li.innerHTML = `
                <div class="flex-grow">
                    <p class="font-semibold text-yellow-custom">${goal.description}</p>
                    ${goal.due_date ? `<p class="text-zinc-500 text-xs mt-1">Prazo: ${new Date(goal.due_date).toLocaleDateString('pt-BR')}</p>` : ''}
                    <p class="text-zinc-500 text-xs mt-1">Status: ${goal.completed ? 'Concluída' : 'Pendente'}</p>
                </div>
                ${userProfile && userProfile.role === 'supervisor' ? `
                <div class="flex-shrink-0 ml-4 flex items-center">
                    <button class="btn btn-edit btn-yellow text-sm py-1 px-2 mr-2" onclick="window.handleEditGoal('${goal.id}', '${goal.description.replace(/'/g, "\\'")}', '${goal.due_date || ''}', ${goal.completed})">Editar</button>
                    <button class="btn btn-delete text-sm py-1 px-2" onclick="window.handleDeleteGoal('${goal.id}')">Excluir</button>
                </div>
                ` : ''}
            `;
            goalsList.appendChild(li);
        });
    } catch (error) {
        console.error('Erro ao carregar metas:', error.message);
        goalsList.innerHTML = `<li class="text-red-400">Erro ao carregar metas: ${error.message}</li>`;
    }
}

/**
 * Adiciona uma nova meta. (Supervisor only)
 */
window.handleAddGoal = async () => {
    if (userProfile && userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para adicionar metas.');
        return;
    }

    const description = prompt('Descrição da Meta:');
    if (!description || description.trim() === '') {
        if (description !== null) window.showMessageModal('A descrição não pode ser vazia.');
        return;
    }

    const dueDate = prompt('Prazo (AAAA-MM-DD, opcional):');
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
        window.showMessageModal('Por favor, insira uma data válida no formato AAAA-MM-DD ou deixe em branco.');
        return;
    }

    try {
        const { error } = await supabase
            .from('goals')
            .insert([{
                user_id: currentUserId, // Associar ao supervisor que adicionou, ou deixar nulo se for meta geral
                description: description.trim(),
                due_date: dueDate || null,
                completed: false
            }]);

        if (error) throw error;

        window.showMessageModal('Meta adicionada com sucesso!');
        await loadGoals();
    } catch (error) {
        console.error('Erro ao adicionar meta:', error.message);
        window.showMessageModal(`Erro ao adicionar meta: ${error.message}`);
    }
};

/**
 * Edita uma meta existente. (Supervisor only)
 */
window.handleEditGoal = (goalId, currentDescription, currentDueDate, currentCompleted) => {
    if (userProfile && userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para editar metas.');
        return;
    }

    window.showMessageModal('Editar Meta:', true, async () => {
        const newDescription = prompt('Nova Descrição:', currentDescription);
        if (!newDescription || newDescription.trim() === '') {
            if (newDescription !== null) window.showMessageModal('A descrição não pode ser vazia.');
            return;
        }

        const newDueDate = prompt('Novo Prazo (AAAA-MM-DD, opcional):', currentDueDate || '');
        if (newDueDate && !/^\d{4}-\d{2}-\d{2}$/.test(newDueDate)) {
            window.showMessageModal('Por favor, insira uma data válida no formato AAAA-MM-DD ou deixe em branco.');
            return;
        }

        const newCompleted = confirm('A meta foi concluída?');

        try {
            const { error } = await supabase
                .from('goals')
                .update({
                    description: newDescription.trim(),
                    due_date: newDueDate || null,
                    completed: newCompleted
                })
                .eq('id', goalId);

            if (error) throw error;

            window.showMessageModal('Meta atualizada com sucesso!');
            await loadGoals();
        } catch (error) {
            console.error('Erro ao atualizar meta:', error.message);
            window.showMessageModal(`Erro ao atualizar meta: ${error.message}`);
        }
    });
};

/**
 * Exclui uma meta. (Supervisor only)
 */
window.handleDeleteGoal = (goalId) => {
    if (userProfile && userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para excluir metas.');
        return;
    }

    window.showMessageModal('Tem certeza que deseja excluir esta meta?', true, async () => {
        try {
            const { error } = await supabase
                .from('goals')
                .delete()
                .eq('id', goalId);

            if (error) throw error;

            window.showMessageModal('Meta excluída com sucesso!');
            await loadGoals();
        } catch (error) {
            console.error('Erro ao excluir meta:', error.message);
            window.showMessageModal(`Erro ao excluir meta: ${error.message}`);
        }
    });
};

/**
 * Carrega e exibe os ramais/grupos.
 */
async function loadRamais() {
    const ramaisList = document.getElementById('ramais-list');
    if (!ramaisList) return;

    try {
        const { data: ramais, error } = await supabase
            .from('ramais')
            .select('*')
            .order('name', { ascending: true }); // Ordena por nome

        if (error) throw error;

        ramaisList.innerHTML = '';
        if (ramais.length === 0) {
            ramaisList.innerHTML = '<li class="text-zinc-500">Nenhum ramal/grupo registrado ainda.</li>';
            return;
        }

        ramais.forEach(ramal => {
            const li = document.createElement('li');
            li.className = 'flex items-start justify-between bg-zinc-800 p-3 rounded-lg mb-2 shadow-inner';
            li.setAttribute('data-ramal-id', ramal.id);
            li.innerHTML = `
                <div class="flex-grow">
                    <p class="font-semibold text-yellow-custom">${ramal.name}</p>
                    <p class="text-white text-sm mt-1">Número: ${ramal.number}</p>
                    ${ramal.group_name ? `<p class="text-zinc-500 text-xs mt-1">Grupo: ${ramal.group_name}</p>` : ''}
                </div>
                ${userProfile && userProfile.role === 'supervisor' ? `
                <div class="flex-shrink-0 ml-4 flex items-center">
                    <button class="btn btn-edit btn-yellow text-sm py-1 px-2 mr-2" onclick="window.handleEditRamal('${ramal.id}', '${ramal.name.replace(/'/g, "\\'")}', '${ramal.number.replace(/'/g, "\\'")}', '${ramal.group_name ? ramal.group_name.replace(/'/g, "\\'") : ''}')">Editar</button>
                    <button class="btn btn-delete text-sm py-1 px-2" onclick="window.handleDeleteRamal('${ramal.id}')">Excluir</button>
                </div>
                ` : ''}
            `;
            ramaisList.appendChild(li);
        });
    } catch (error) {
        console.error('Erro ao carregar ramais:', error.message);
        ramaisList.innerHTML = `<li class="text-red-400">Erro ao carregar ramais: ${error.message}</li>`;
    }
}

/**
 * Adiciona um novo ramal/grupo. (Supervisor only)
 */
window.handleAddRamal = async () => {
    if (userProfile && userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para adicionar ramais.');
        return;
    }

    const name = prompt('Nome do Ramal/Grupo:');
    if (!name || name.trim() === '') {
        if (name !== null) window.showMessageModal('O nome não pode ser vazio.');
        return;
    }

    const number = prompt('Número do Ramal:');
    if (!number || number.trim() === '') {
        if (number !== null) window.showMessageModal('O número não pode ser vazio.');
        return;
    }

    const groupName = prompt('Nome do Grupo (opcional):');

    try {
        const { error } = await supabase
            .from('ramais')
            .insert([{ name: name.trim(), number: number.trim(), group_name: groupName ? groupName.trim() : null }]);

        if (error) throw error;

        window.showMessageModal('Ramal/Grupo adicionado com sucesso!');
        await loadRamais();
    } catch (error) {
        console.error('Erro ao adicionar ramal:', error.message);
        window.showMessageModal(`Erro ao adicionar ramal: ${error.message}`);
    }
};

/**
 * Edita um ramal/grupo existente. (Supervisor only)
 */
window.handleEditRamal = (ramalId, currentName, currentNumber, currentGroupName) => {
    if (userProfile && userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para editar ramais.');
        return;
    }

    window.showMessageModal('Editar Ramal/Grupo:', true, async () => {
        const newName = prompt('Novo Nome:', currentName);
        if (!newName || newName.trim() === '') {
            if (newName !== null) window.showMessageModal('O nome não pode ser vazio.');
            return;
        }

        const newNumber = prompt('Novo Número:', currentNumber);
        if (!newNumber || newNumber.trim() === '') {
            if (newNumber !== null) window.showMessageModal('O número não pode ser vazio.');
            return;
        }

        const newGroupName = prompt('Novo Nome do Grupo (opcional):', currentGroupName);

        try {
            const { error } = await supabase
                .from('ramais')
                .update({
                    name: newName.trim(),
                    number: newNumber.trim(),
                    group_name: newGroupName ? newGroupName.trim() : null
                })
                .eq('id', ramalId);

            if (error) throw error;

            window.showMessageModal('Ramal/Grupo atualizado com sucesso!');
            await loadRamais();
        } catch (error) {
            console.error('Erro ao atualizar ramal:', error.message);
            window.showMessageModal(`Erro ao atualizar ramal: ${error.message}`);
        }
    });
};

/**
 * Exclui um ramal/grupo. (Supervisor only)
 */
window.handleDeleteRamal = (ramalId) => {
    if (userProfile && userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para excluir ramais.');
        return;
    }

    window.showMessageModal('Tem certeza que deseja excluir este ramal/grupo?', true, async () => {
        try {
            const { error } = await supabase
                .from('ramais')
                .delete()
                .eq('id', ramalId);

            if (error) throw error;

            window.showMessageModal('Ramal/Grupo excluído com sucesso!');
            await loadRamais();
        } catch (error) {
            console.error('Erro ao excluir ramal:', error.message);
            window.showMessageModal(`Erro ao excluir ramal: ${error.message}`);
        }
    });
};

/**
 * Carrega e exibe os links úteis.
 */
async function loadUsefulLinks() {
    const linksList = document.getElementById('links-full-list');
    if (!linksList) return;

    try {
        const { data: links, error } = await supabase
            .from('useful_links')
            .select('*')
            .order('title', { ascending: true }); // Ordena por título

        if (error) throw error;

        linksList.innerHTML = '';
        if (links.length === 0) {
            linksList.innerHTML = '<li class="text-zinc-500">Nenhum link útil registrado ainda.</li>';
            return;
        }

        links.forEach(link => {
            const li = document.createElement('li');
            li.className = 'flex items-start justify-between bg-zinc-800 p-3 rounded-lg mb-2 shadow-inner';
            li.setAttribute('data-link-id', link.id);
            li.innerHTML = `
                <div class="flex-grow">
                    <a href="${link.url}" target="_blank" class="font-semibold text-yellow-custom hover:underline">${link.title}</a>
                    <p class="text-white text-sm mt-1">${link.url}</p>
                    ${link.category ? `<p class="text-zinc-500 text-xs mt-1">Categoria: ${link.category}</p>` : ''}
                </div>
                ${userProfile && userProfile.role === 'supervisor' ? `
                <div class="flex-shrink-0 ml-4 flex items-center">
                    <button class="btn btn-edit btn-yellow text-sm py-1 px-2 mr-2" onclick="window.handleEditLink('${link.id}', '${link.title.replace(/'/g, "\\'")}', '${link.url.replace(/'/g, "\\'")}', '${link.category ? link.category.replace(/'/g, "\\'") : ''}')">Editar</button>
                    <button class="btn btn-delete text-sm py-1 px-2" onclick="window.handleDeleteLink('${link.id}')">Excluir</button>
                </div>
                ` : ''}
            `;
            linksList.appendChild(li);
        });
    } catch (error) {
        console.error('Erro ao carregar links úteis:', error.message);
        linksList.innerHTML = `<li class="text-red-400">Erro ao carregar links: ${error.message}</li>`;
    }
}

/**
 * Adiciona um novo link útil. (Supervisor only)
 */
window.handleAddLink = async () => {
    if (userProfile && userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para adicionar links.');
        return;
    }

    const title = prompt('Título do Link:');
    if (!title || title.trim() === '') {
        if (title !== null) window.showMessageModal('O título não pode ser vazio.');
        return;
    }

    const url = prompt('URL do Link:');
    if (!url || url.trim() === '') {
        if (url !== null) window.showMessageModal('A URL não pode ser vazia.');
        return;
    }

    const category = prompt('Categoria (opcional):');

    try {
        const { error } = await supabase
            .from('useful_links')
            .insert([{ title: title.trim(), url: url.trim(), category: category ? category.trim() : null }]);

        if (error) throw error;

        window.showMessageModal('Link adicionado com sucesso!');
        await loadUsefulLinks();
    } catch (error) {
        console.error('Erro ao adicionar link:', error.message);
        window.showMessageModal(`Erro ao adicionar link: ${error.message}`);
    }
};

/**
 * Edita um link útil existente. (Supervisor only)
 */
window.handleEditLink = (linkId, currentTitle, currentUrl, currentCategory) => {
    if (userProfile && userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para editar links.');
        return;
    }

    window.showMessageModal('Editar Link Útil:', true, async () => {
        const newTitle = prompt('Novo Título:', currentTitle);
        if (!newTitle || newTitle.trim() === '') {
            if (newTitle !== null) window.showMessageModal('O título não pode ser vazio.');
            return;
        }

        const newUrl = prompt('Nova URL:', currentUrl);
        if (!newUrl || newUrl.trim() === '') {
            if (newUrl !== null) window.showMessageModal('A URL não pode ser vazia.');
            return;
        }

        const newCategory = prompt('Nova Categoria (opcional):', currentCategory);

        try {
            const { error } = await supabase
                .from('useful_links')
                .update({
                    title: newTitle.trim(),
                    url: newUrl.trim(),
                    category: newCategory ? newCategory.trim() : null
                })
                .eq('id', linkId);

            if (error) throw error;

            window.showMessageModal('Link atualizado com sucesso!');
            await loadUsefulLinks();
        } catch (error) {
            console.error('Erro ao atualizar link:', error.message);
            window.showMessageModal(`Erro ao atualizar link: ${error.message}`);
        }
    });
};

/**
 * Exclui um link útil. (Supervisor only)
 */
window.handleDeleteLink = (linkId) => {
    if (userProfile && userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para excluir links.');
        return;
    }

    window.showMessageModal('Tem certeza que deseja excluir este link útil?', true, async () => {
        try {
            const { error } = await supabase
                .from('useful_links')
                .delete()
                .eq('id', linkId);

            if (error) throw error;

            window.showMessageModal('Link útil excluído com sucesso!');
            await loadUsefulLinks();
        } catch (error) {
            console.error('Erro ao excluir link:', error.message);
            window.showMessageModal(`Erro ao excluir link: ${error.message}`);
        }
    });
};

/**
 * Carrega e exibe os perfis dos colaboradores. (Supervisor only)
 */
async function loadCollaboratorProfiles() {
    const collaboratorProfilesList = document.getElementById('collaborator-profiles-list');
    if (!collaboratorProfilesList) return;

    if (userProfile && userProfile.role !== 'supervisor') {
        collaboratorProfilesList.innerHTML = '<li class="text-zinc-500">Você não tem permissão para visualizar perfis de colaboradores.</li>';
        return;
    }

    try {
        const { data: profiles, error } = await supabase
            .from('user_profiles')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        collaboratorProfilesList.innerHTML = '';
        if (profiles.length === 0) {
            collaboratorProfilesList.innerHTML = '<li class="text-zinc-500">Nenhum perfil de colaborador registrado ainda.</li>';
            return;
        }

        profiles.forEach(profile => {
            const li = document.createElement('li');
            li.className = 'flex items-center bg-zinc-800 p-3 rounded-lg mb-2 shadow-inner';
            li.setAttribute('data-user-id', profile.user_id);
            li.innerHTML = `
                <img src="${profile.avatar_url || 'https://via.placeholder.com/32/FFD700/000000?text=JD'}" alt="Avatar" class="rounded-full w-8 h-8 mr-3">
                <div>
                    <p class="font-semibold text-yellow-custom">${profile.name || 'Nome Desconhecido'}</p>
                    <p class="text-zinc-400 text-sm">${profile.role || 'Cargo Desconhecido'}</p>
                    <p class="text-zinc-500 text-xs">ID: ${profile.user_id}</p>
                </div>
                <div class="ml-auto">
                    <button class="btn btn-edit btn-yellow" onclick="window.handleViewCollaboratorProfile('${profile.user_id}')">Ver Perfil</button>
                </div>
            `;
            collaboratorProfilesList.appendChild(li);
        });
    } catch (error) {
        console.error('Erro ao carregar perfis de colaboradores:', error.message);
        collaboratorProfilesList.innerHTML = `<li class="text-red-400">Erro ao carregar perfis: ${error.message}</li>`;
    }
}

// Placeholder para visualização do perfil do colaborador (Supervisor only)
window.handleViewCollaboratorProfile = async (userId) => {
    window.showMessageModal(`Visualizando perfil do colaborador com ID: ${userId}. (Funcionalidade completa a ser implementada)`);
    // Aqui, você poderia buscar informações públicas mais detalhadas ou navegar para uma visualização de perfil dedicada
};

// --- Carregamento de Dados na Inicialização da Página ---
document.addEventListener('DOMContentLoaded', async () => {
    // A autenticação é gerenciada pelo onAuthStateChange do Supabase.
    // As funções de carregamento de dados serão chamadas quando o usuário estiver autenticado.

    // Verifica qual página está sendo carregada e carrega os dados relevantes
    const path = window.location.pathname;

    if (path.includes('index.html') || path === '/') {
        // Dashboard
        // Não há dados específicos para carregar no dashboard principal além do perfil do usuário
    } else if (path.includes('prompts.html')) {
        await loadPrompts();
    } else if (path.includes('aprendizados.html')) {
        await loadLearnings();
    } else if (path.includes('meu_perfil.html')) {
        // A página de perfil do usuário pode ter lógica para editar o próprio perfil
        // Por enquanto, o perfil é carregado pelo onAuthStateChange
    } else if (path.includes('alinhamentos.html')) {
        await loadAlignments();
    } else if (path.includes('notes_goals.html')) {
        await loadGoals();
        await loadPersonalNotes(); // Carrega anotações pessoais também
    } else if (path.includes('ramais_groups.html')) {
        await loadRamais();
    } else if (path.includes('useful_links.html')) {
        await loadUsefulLinks();
    } else if (path.includes('collaborator_profiles.html')) {
        await loadCollaboratorProfiles();
    }
});

// --- Funções para a página de Login (login.html) ---
// Estas funções são para a página de login e assumem que você terá um formulário de login.
// Se você não tem uma página de login separada e está usando apenas o fluxo de autenticação do Canvas,
// estas funções podem não ser diretamente aplicáveis ou precisarão ser adaptadas.

window.handleLogin = async (email, password) => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            throw error;
        }

        if (data.user) {
            window.showMessageModal('Login realizado com sucesso!');
            // onAuthStateChange vai redirecionar para index.html
        } else {
            window.showMessageModal('Nenhum usuário encontrado com essas credenciais.');
        }
    } catch (error) {
        console.error('Erro de login:', error.message);
        window.showMessageModal(`Erro de login: ${error.message}`);
    }
};

window.handleSignUp = async (email, password) => {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) {
            throw error;
        }

        if (data.user) {
            window.showMessageModal('Cadastro realizado com sucesso! Verifique seu e-mail para confirmar.');
            // onAuthStateChange vai lidar com o redirecionamento após a confirmação
        } else {
            window.showMessageModal('Erro ao cadastrar. Tente novamente.');
        }
    } catch (error) {
        console.error('Erro de cadastro:', error.message);
        window.showMessageModal(`Erro de cadastro: ${error.message}`);
    }
};

// Exemplo de como você pode chamar handleLogin/handleSignUp em seu login.html
// Se você tem um formulário de login, adicione event listeners aos botões
// document.getElementById('login-button').addEventListener('click', () => {
//     const email = document.getElementById('email').value;
//     const password = document.getElementById('password').value;
//     window.handleLogin(email, password);
// });
// document.getElementById('signup-button').addEventListener('click', () => {
//     const email = document.getElementById('email').value;
//     const password = document.getElementById('password').value;
//     window.handleSignUp(email, password);
// });

