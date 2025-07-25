// prompts.js (Lógica específica para a aba de Prompts)

// Importa as variáveis globais e funções do script.js principal
// Certifique-se de que script.js seja carregado antes de prompts.js no HTML
const supabase = window.supabase;
let userProfile = window.userProfile; // Será atualizado por script.js
const showMessageModal = window.showMessageModal;

// Variáveis de estado e elementos DOM específicos da aba de prompts
let editingPromptId = null; // Para controlar qual prompt está sendo editado

const promptTitleInput = document.getElementById('prompt-title-input');
const promptCategoryInput = document.getElementById('prompt-category-input');
const promptContentTextarea = document.getElementById('prompt-content-textarea');
const savePromptButton = document.getElementById('save-prompt-button');
const cancelEditButton = document.getElementById('cancel-edit-button');
const promptsList = document.getElementById('prompts-list');
const promptSearchInput = document.getElementById('prompt-search-input');

// --- Prompt Management Functions ---

/**
 * Carrega e exibe os prompts do Supabase.
 * @param {string} searchTerm Termo de busca opcional para filtrar prompts.
 */
window.loadPrompts = async (searchTerm = '') => {
    if (!promptsList) {
        console.warn("Elemento 'prompts-list' não encontrado. Não é possível carregar prompts.");
        return;
    }

    // Atualiza o userProfile caso ele tenha sido carregado após este script
    userProfile = window.userProfile;

    try {
        let query = supabase
            .from('prompts')
            .select('*')
            .order('created_at', { ascending: false });

        if (searchTerm) {
            // Filtra por título ou conteúdo (case-insensitive)
            query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
        }

        const { data: prompts, error } = await query;

        if (error) throw error;

        promptsList.innerHTML = '';
        if (prompts.length === 0) {
            promptsList.innerHTML = '<li class="text-slate-400">Nenhum prompt disponível ainda.</li>';
            return;
        }

        prompts.forEach(prompt => {
            const li = document.createElement('li');
            li.className = 'bg-slate-700 p-4 rounded-lg shadow-inner flex flex-col items-start mb-2';
            li.setAttribute('data-prompt-id', prompt.id);
            li.innerHTML = `
                <div class="prompt-header w-full flex justify-between items-center mb-2">
                    <h4 class="font-semibold text-yellow-custom text-lg">${prompt.title}</h4>
                    <div class="prompt-actions flex space-x-2">
                        <button class="btn btn-copy bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 px-2" onclick="window.handleCopyPrompt('${prompt.content.replace(/'/g, "\\'")}')">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2.25A2.25 2.25 0 0121 7.25v10.5A2.25 2.25 0 0118.75 20H5.25A2.25 2.25 0 013 17.75V5.25A2.25 2.25 0 015.25 3H8"></path></svg>
                            Copiar
                        </button>
                        ${userProfile && userProfile.role === 'supervisor' ? `
                        <button class="btn btn-edit btn-yellow text-sm py-1 px-2" onclick="window.handleEditPrompt('${prompt.id}', '${prompt.title.replace(/'/g, "\\'")}', '${prompt.content.replace(/'/g, "\\'")}', '${prompt.category ? prompt.category.replace(/'/g, "\\'") : ''}')">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            Editar
                        </button>
                        <button class="btn btn-delete bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-2" onclick="window.handleDeletePrompt('${prompt.id}')">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            Excluir
                        </button>
                        ` : ''}
                    </div>
                </div>
                <p class="prompt-content text-slate-200">${prompt.content}</p>
                ${prompt.category ? `<p class="text-slate-400 text-xs mt-1">Categoria: ${prompt.category}</p>` : ''}
            `;
            promptsList.appendChild(li);
        });
    } catch (error) {
        console.error('Erro ao carregar prompts:', error.message);
        promptsList.innerHTML = `<li class="text-red-400">Erro ao carregar prompts: ${error.message}</li>`;
    }
};

/**
 * Copia o conteúdo de um prompt para a área de transferência.
 * @param {string} content O conteúdo do prompt a ser copiado.
 */
window.handleCopyPrompt = async (content) => {
    try {
        // Usa document.execCommand('copy') como fallback para garantir compatibilidade em iframes
        const textarea = document.createElement('textarea');
        textarea.value = content;
        textarea.style.position = 'fixed'; // Evita que o textarea afete o layout
        textarea.style.opacity = 0; // Torna o textarea invisível
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);

        showMessageModal('Prompt copiado para a área de transferência!');
    } catch (err) {
        console.error('Erro ao copiar prompt:', err);
        showMessageModal('Falha ao copiar prompt. Por favor, copie manualmente.');
    }
};

/**
 * Adiciona ou atualiza um prompt.
 */
const handleSavePrompt = async () => {
    // Atualiza o userProfile para a verificação de permissão mais recente
    userProfile = window.userProfile;
    if (!userProfile || userProfile.role !== 'supervisor') {
        showMessageModal('Você não tem permissão para adicionar/editar prompts.');
        return;
    }

    const title = promptTitleInput.value.trim();
    const content = promptContentTextarea.value.trim();
    const category = promptCategoryInput.value.trim();

    if (!title) {
        showMessageModal('O título do prompt não pode ser vazio.');
        return;
    }
    if (!content) {
        showMessageModal('O conteúdo do prompt não pode ser vazio.');
        return;
    }

    try {
        if (editingPromptId) {
            // Atualizar prompt existente
            const { error } = await supabase
                .from('prompts')
                .update({ title: title, content: content, category: category || null })
                .eq('id', editingPromptId);

            if (error) throw error;
            showMessageModal('Prompt atualizado com sucesso!');
        } else {
            // Adicionar novo prompt
            const { error } = await supabase
                .from('prompts')
                .insert([{ title: title, content: content, category: category || null }]);

            if (error) throw error;
            showMessageModal('Prompt adicionado com sucesso!');
        }

        // Limpar formulário e redefinir estado de edição
        promptTitleInput.value = '';
        promptContentTextarea.value = '';
        promptCategoryInput.value = '';
        editingPromptId = null;
        cancelEditButton.classList.add('hidden'); // Oculta o botão Cancelar

        await window.loadPrompts(); // Recarrega a lista de prompts
    } catch (error) {
        console.error('Erro ao salvar prompt:', error.message);
        showMessageModal(`Erro ao salvar prompt: ${error.message}`);
    }
};

/**
 * Preenche o formulário para edição de um prompt.
 * @param {string} promptId O ID do prompt a ser editado.
 * @param {string} title O título do prompt.
 * @param {string} content O conteúdo do prompt.
 * @param {string} category A categoria do prompt.
 */
window.handleEditPrompt = (promptId, title, content, category) => {
    userProfile = window.userProfile; // Atualiza o userProfile
    if (!userProfile || userProfile.role !== 'supervisor') {
        showMessageModal('Você não tem permissão para editar prompts.');
        return;
    }
    editingPromptId = promptId;
    promptTitleInput.value = title;
    promptContentTextarea.value = content;
    promptCategoryInput.value = category;
    cancelEditButton.classList.remove('hidden'); // Mostra o botão Cancelar
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo para o formulário
};

/**
 * Cancela a edição de um prompt, limpando o formulário.
 */
const handleCancelEdit = () => {
    editingPromptId = null;
    promptTitleInput.value = '';
    promptContentTextarea.value = '';
    promptCategoryInput.value = '';
    cancelEditButton.classList.add('hidden');
};

/**
 * Exclui um prompt. (Supervisor only)
 * @param {string} promptId O ID do prompt a ser excluído.
 */
window.handleDeletePrompt = (promptId) => {
    userProfile = window.userProfile; // Atualiza o userProfile
    if (!userProfile || userProfile.role !== 'supervisor') {
        showMessageModal('Você não tem permissão para excluir prompts.');
        return;
    }

    showMessageModal('Tem certeza que deseja excluir este prompt?', 'confirm', async () => {
        try {
            const { error } = await supabase
                .from('prompts')
                .delete()
                .eq('id', promptId);

            if (error) throw error;

            showMessageModal('Prompt excluído com sucesso!');
            await window.loadPrompts();
        } catch (error) {
            console.error('Erro ao excluir prompt:', error.message);
            showMessageModal(`Erro ao excluir prompt: ${error.message}`);
        }
    });
};

// --- Event Listeners and Initial Load for Prompts Tab ---
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners for Prompt Management
    if (savePromptButton) {
        savePromptButton.addEventListener('click', handleSavePrompt);
    }
    if (cancelEditButton) {
        cancelEditButton.addEventListener('click', handleCancelEdit);
    }
    if (promptSearchInput) {
        promptSearchInput.addEventListener('input', (event) => {
            // Adiciona um pequeno delay para evitar muitas chamadas ao Supabase
            clearTimeout(promptSearchInput.dataset.timeout);
            promptSearchInput.dataset.timeout = setTimeout(() => {
                window.loadPrompts(event.target.value);
            }, 300); // Busca após 300ms de inatividade
        });
    }

    // Carrega os prompts quando a página prompts.html é carregada
    // Garante que o usuário está logado antes de tentar carregar os prompts
    // A função checkUserSession em script.js já lida com o redirecionamento
    // então aqui apenas chamamos loadPrompts se o userProfile já estiver disponível.
    // Ou, se você preferir, pode chamar loadPrompts diretamente aqui e lidar com a autenticação dentro dela.
    // Para este setup, dependemos do onAuthStateChange do script.js para acionar o loadPrompts.
    // No entanto, para garantir que o loadPrompts seja chamado ao carregar a página de prompts,
    // vamos adicionar um listener para o evento 'userProfileLoaded' que será disparado pelo script.js
    // ou chamar loadPrompts diretamente se já tiver userProfile.
    if (window.userProfile) {
        window.loadPrompts();
    } else {
        // Se userProfile ainda não estiver disponível, escuta o evento customizado
        document.addEventListener('userProfileLoaded', () => {
            window.loadPrompts();
        });
    }
});