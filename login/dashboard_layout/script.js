// script.js (Arquivo principal e global)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Supabase Credentials (replace with your actual values if different)
const SUPABASE_URL = 'https://umpufxwgaxgyhzhbjaep.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtcHVmeHdnYXgyaHpoYmphZXAubnF3dGouY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE3NjY0NDEsImV4cCI6MTczNzYwNjQ0MX0.yYw259mE3-wR3i1sTz620_R60x_r09b1P4n33nB7m-s';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global state variables (minimize their use, prefer passing as arguments)
let currentUser = null;
let userProfile = null;
let currentUserId = null;

// Exporte supabase e userProfile para que outros scripts possam usá-los
window.supabase = supabase;
window.userProfile = userProfile; // Será atualizado após o carregamento do perfil

// --- UI Functions (Message Modal) ---
const messageModal = document.getElementById('messageModal');
const modalMessage = document.getElementById('modalMessage');
const modalButtons = messageModal ? messageModal.querySelector('.modal-buttons') : null;

/**
 * Exibe um modal de mensagem ou confirmação.
 * @param {string} message A mensagem a ser exibida.
 * @param {string} type O tipo de modal ('alert' ou 'confirm').
 * @param {function} onConfirm Callback para o botão 'OK' em modais de confirmação.
 */
window.showMessageModal = (message, type = 'alert', onConfirm = null) => {
    if (!messageModal || !modalMessage || !modalButtons) {
        console.error('Modal elements not found.');
        return;
    }
    modalMessage.textContent = message;
    modalButtons.innerHTML = ''; // Clear previous buttons

    if (type === 'confirm' && onConfirm) {
        const okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.classList.add('modal-button', 'primary');
        okButton.onclick = () => {
            onConfirm();
            window.closeModal();
        };

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancelar';
        cancelButton.classList.add('modal-button', 'secondary', 'ml-2'); // Adiciona margem
        cancelButton.onclick = () => {
            window.closeModal();
        };

        modalButtons.appendChild(okButton);
        modalButtons.appendChild(cancelButton);
    } else {
        const okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.classList.add('modal-button', 'primary');
        okButton.onclick = window.closeModal;
        modalButtons.appendChild(okButton);
    }
    messageModal.style.display = 'flex'; // Use flex to center
};

/**
 * Fecha o modal de mensagem.
 */
window.closeModal = () => {
    if (messageModal) {
        messageModal.style.display = 'none';
    }
};

// Event listeners for modal
document.addEventListener('DOMContentLoaded', () => {
    if (messageModal) {
        const closeButton = messageModal.querySelector('.close-button');
        if (closeButton) {
            closeButton.addEventListener('click', window.closeModal);
        }
        // Adiciona um listener ao modal para fechar ao clicar fora, mas apenas se não for um clique nos botões
        messageModal.addEventListener('click', (event) => {
            if (event.target === messageModal) {
                window.closeModal();
            }
        });
    }
});


// --- Supabase Authentication and User Management ---

/**
 * Atualiza a visibilidade dos controles de supervisor com base na função do usuário.
 */
function updateSupervisorControlsVisibility() {
    const supervisorElements = document.querySelectorAll('[data-role="supervisor"]');
    if (window.userProfile && window.userProfile.role === 'supervisor') {
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
            window.userProfile = userProfile; // Atualiza a variável global exportada
            document.getElementById('user-name').textContent = userProfile.name || 'Nome Desconhecido';
            document.getElementById('user-role').textContent = userProfile.role || 'Cargo Desconhecido';
            document.getElementById('user-avatar').src = userProfile.avatar_url || 'https://via.placeholder.com/32/FFD700/000000?text=JD';
            // Atualiza o avatar no cabeçalho também, se existir
            const headerUserAvatar = document.getElementById('header-user-avatar');
            if (headerUserAvatar) {
                headerUserAvatar.src = userProfile.avatar_url || 'https://via.placeholder.com/40/6a0dad/ffffff?text=U';
            }
            // Atualiza o nome de exibição no cabeçalho
            const userDisplayNameElement = document.getElementById('user-display-name');
            if (userDisplayNameElement) {
                userDisplayNameElement.textContent = userProfile.name.split(' ')[0]; // Exibe apenas o primeiro nome
            }

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
        window.userProfile = userProfile; // Atualiza a variável global exportada
        document.getElementById('user-name').textContent = userProfile.name;
        document.getElementById('user-role').textContent = userProfile.role;
        document.getElementById('user-avatar').src = userProfile.avatar_url;
        const headerUserAvatar = document.getElementById('header-user-avatar');
        if (headerUserAvatar) {
            headerUserAvatar.src = userProfile.avatar_url;
        }
        const userDisplayNameElement = document.getElementById('user-display-name');
        if (userDisplayNameElement) {
            userDisplayNameElement.textContent = userProfile.name.split(' ')[0];
        }

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

        // Verifica qual página está sendo carregada e carrega os dados relevantes
        const path = window.location.pathname;
        if (path.includes('index.html') || path === '/') {
            // loadDashboardData(); // Se houver dados específicos para o dashboard principal
        } else if (path.includes('prompts.html')) {
            // A função loadPrompts será chamada pelo prompts.js
            // Certifique-se de que prompts.js seja carregado APÓS script.js no HTML
        } else if (path.includes('aprendizados.html')) {
            // await loadLearnings(); // Descomente e implemente se necessário
        } else if (path.includes('meu_perfil.html')) {
            // Lógica para carregar e talvez editar o perfil do usuário
        } else if (path.includes('alinhamentos.html')) {
            // await loadAlignments(); // Descomente e implemente se necessário
        } else if (path.includes('notes_goals.html')) {
            // await loadGoals(); // Descomente e implemente se necessário
            // await loadPersonalNotes(); // Descomente e implemente se necessário
        } else if (path.includes('ramais_groups.html')) {
            // await loadRamais(); // Descomente e implemente se necessário
        } else if (path.includes('useful_links.html')) {
            // await loadUsefulLinks(); // Descomente e implemente se necessário
        } else if (path.includes('collaborator_profiles.html')) {
            // await loadCollaboratorProfiles(); // Descomente e implemente se necessário
        }

        // Redireciona para o dashboard se estiver na página de login
        if (window.location.pathname.endsWith('login.html') || window.location.pathname === '/') {
            window.location.href = 'index.html';
        }
    } else {
        currentUser = null;
        currentUserId = null;
        userProfile = null;
        window.userProfile = null; // Zera a variável global exportada
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

// --- Funções de Carregamento de Dados para o Dashboard (seções não-prompts) ---
// Estas funções são placeholders para o dashboard principal, caso você opte por usá-las.
// Elas não foram modificadas significativamente, pois o foco agora é na aba de prompts.

// Simulate fetching data (replace with actual Supabase calls)
const fetchMetricData = async () => {
    // Example: Fetch total sales, revenue, visitors, new orders from Supabase
    // const { data, error } = await supabase.from('metrics').select('*').single();
    // if (error) throw error;
    // return data;

    // Mock data for demonstration
    return {
        totalSales: '124,500',
        totalRevenue: '56,789',
        totalVisitors: '8,901',
        newOrders: '450'
    };
};

const fetchChartData = async () => {
    // Example: Fetch sales over time and revenue vs expenses data
    // const { data, error } = await supabase.from('sales_data').select('*');
    // if (error) throw error;
    // return data;

    // Mock data for demonstration
    return {
        salesData: [100, 150, 120, 180, 200, 170, 220],
        salesLabels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        revenueData: [300, 350, 320, 380, 400, 370, 420],
        expensesData: [150, 170, 160, 180, 190, 175, 200],
        revenueExpensesLabels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7']
    };
};

const fetchRecentOrders = async () => {
    // Example: Fetch recent orders from Supabase
    // const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5);
    // if (error) throw error;
    // return data;

    // Mock data for demonstration
    return [
        { id: '#87654', client: 'João Silva', product: 'Laptop X1', value: '$1200.00', status: 'Pendente' },
        { id: '#87653', client: 'Maria Oliveira', product: 'Mouse Ergonômico', value: '$45.00', status: 'Concluído' },
        { id: '#87652', client: 'Carlos Santos', product: 'Teclado Mecânico', value: '$99.99', status: 'Concluído' },
        { id: '#87651', client: 'Ana Souza', product: 'Monitor Curvo', value: '$350.00', status: 'Cancelado' },
        { id: '#87650', client: 'Pedro Rocha', product: 'Webcam HD', value: '$60.00', status: 'Concluído' },
    ];
};

const fetchTopProducts = async () => {
    // Example: Fetch top products from Supabase
    // const { data, error } = await supabase.from('products').select('name, sales_count').order('sales_count', { ascending: false }).limit(4);
    // if (error) throw error;
    // return data;

    // Mock data for demonstration
    return [
        { name: 'Laptop Pro', sales_count: 150 },
        { name: 'Smartphone Ultra', sales_count: 120 },
        { name: 'Fone de Ouvido Noise-Cancelling', sales_count: 90 },
        { name: 'Smartwatch Gen 3', sales_count: 75 },
    ];
};

const loadDashboardData = async () => {
    try {
        // Load metric cards
        const totalSalesElement = document.getElementById('total-sales');
        const totalRevenueElement = document.getElementById('total-revenue');
        const totalVisitorsElement = document.getElementById('total-visitors');
        const newOrdersElement = document.getElementById('new-orders');

        if (totalSalesElement && totalRevenueElement && totalVisitorsElement && newOrdersElement) {
            const metrics = await fetchMetricData();
            totalSalesElement.textContent = `$${metrics.totalSales}`;
            totalRevenueElement.textContent = `$${metrics.totalRevenue}`;
            totalVisitorsElement.textContent = metrics.totalVisitors;
            newOrdersElement.textContent = metrics.newOrders;
        }


        // Load charts (only if elements exist)
        const salesChartCanvas = document.getElementById('salesChart');
        const revenueExpensesChartCanvas = document.getElementById('revenueExpensesChart');

        if (salesChartCanvas && revenueExpensesChartCanvas) {
            const chartData = await fetchChartData();
            renderSalesChart(chartData.salesLabels, chartData.salesData);
            renderRevenueExpensesChart(chartData.revenueExpensesLabels, chartData.revenueData, chartData.expensesData);
        }

        // Load recent orders table (only if element exists)
        const recentOrdersTableBody = document.getElementById('recent-orders-table-body');
        if (recentOrdersTableBody) {
            const recentOrders = await fetchRecentOrders();
            renderRecentOrdersTable(recentOrders);
        }


        // Load top products list (only if element exists)
        const topProductsList = document.getElementById('top-products-list');
        if (topProductsList) {
            const topProducts = await fetchTopProducts();
            renderTopProductsList(topProducts);
        }

        // Load personal notes (if any, using Supabase for notes)
        const personalNotesList = document.getElementById('personal-notes-list');
        if (personalNotesList) {
            loadPersonalNotes();
        }

    } catch (error) {
        console.error('Error loading dashboard data:', error.message);
        // Only show modal if it's not a "not found" error for optional elements
        if (!error.message.includes("null")) { // Basic check to avoid modal for missing elements
            window.showMessageModal(`Erro ao carregar dados do dashboard: ${error.message}`);
        }
    }
};

// --- Chart Rendering Functions (Chart.js) ---
let salesChartInstance = null;
let revenueExpensesChartInstance = null;

const renderSalesChart = (labels, data) => {
    const ctx = document.getElementById('salesChart').getContext('2d');
    if (salesChartInstance) {
        salesChartInstance.destroy(); // Destroy existing chart instance
    }
    salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Vendas',
                data: data,
                backgroundColor: 'rgba(139, 92, 246, 0.2)', // violet-500 with transparency
                borderColor: '#8b5cf6', // violet-500
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#334155' // Slate-700 for grid lines
                    },
                    ticks: {
                        color: '#e2e8f0' // Slate-200 for tick labels
                    }
                },
                x: {
                    grid: {
                        color: '#334155'
                    },
                    ticks: {
                        color: '#e2e8f0'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#e2e8f0' // Slate-200 for legend text
                    }
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#e2e8f0',
                    bodyColor: '#e2e8f0',
                    borderColor: '#475569',
                    borderWidth: 1
                }
            }
        }
    });
};

const renderRevenueExpensesChart = (labels, revenueData, expensesData) => {
    const ctx = document.getElementById('revenueExpensesChart').getContext('2d');
    if (revenueExpensesChartInstance) {
        revenueExpensesChartInstance.destroy(); // Destroy existing chart instance
    }
    revenueExpensesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Receita',
                    data: revenueData,
                    backgroundColor: '#10b981', // Emerald-500
                    borderRadius: 5
                },
                {
                    label: 'Despesas',
                    data: expensesData,
                    backgroundColor: '#ef4444', // Red-500
                    borderRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#334155'
                    },
                    ticks: {
                        color: '#e2e8f0'
                    }
                },
                x: {
                    grid: {
                        color: '#334155'
                    },
                    ticks: {
                        color: '#e2e8f0'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#e2e8f0'
                    }
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#e2e8f0',
                    bodyColor: '#e2e8f0',
                    borderColor: '#475569',
                    borderWidth: 1
                }
            }
        }
    });
};

// --- Table and List Rendering Functions ---
const renderRecentOrdersTable = (orders) => {
    const tableBody = document.getElementById('recent-orders-table-body');
    if (!tableBody) return; // Ensure element exists
    tableBody.innerHTML = ''; // Clear existing rows

    orders.forEach(order => {
        const row = document.createElement('tr');
        let statusClass = '';
        switch (order.status) {
            case 'Pendente':
                statusClass = 'text-yellow-400';
                break;
            case 'Concluído':
                statusClass = 'text-green-400';
                break;
            case 'Cancelado':
                statusClass = 'text-red-400';
                break;
            default:
                statusClass = 'text-slate-400';
        }
        row.innerHTML = `
            <td>${order.id}</td>
            <td>${order.client}</td>
            <td>${order.product}</td>
            <td>${order.value}</td>
            <td class="${statusClass}">${order.status}</td>
        `;
        tableBody.appendChild(row);
    });
};

const renderTopProductsList = (products) => {
    const list = document.getElementById('top-products-list');
    if (!list) return; // Ensure element exists
    list.innerHTML = ''; // Clear existing items

    products.forEach(product => {
        const listItem = document.createElement('li');
        listItem.classList.add('flex', 'justify-between', 'items-center', 'text-slate-300');
        listItem.innerHTML = `
            <span>${product.name}</span>
            <span class="font-medium text-white">${product.sales_count} vendas</span>
        `;
        list.appendChild(listItem);
    });
};


// --- Personal Notes Functions (Supabase Integration) ---
const newPersonalNoteInput = document.getElementById('new-personal-note');
const addNoteButton = document.getElementById('add-note-button');
const personalNotesList = document.getElementById('personal-notes-list');

/**
 * Carrega e exibe notas pessoais do Supabase.
 */
async function loadPersonalNotes() {
    if (!personalNotesList || !currentUserId) {
        console.warn("No personal notes list element or user ID available to load personal notes.");
        if (personalNotesList) {
            personalNotesList.innerHTML = '<li class="text-slate-400">Faça login para ver suas anotações.</li>';
        }
        return;
    }

    try {
        const { data: notes, error } = await supabase
            .from('personal_notes') // Assuming you have a table named 'personal_notes'
            .select('*')
            .eq('user_id', currentUserId)
            .order('created_at', { ascending: false }); // Ordena por data de criação

        if (error) throw error;

        personalNotesList.innerHTML = ''; // Limpa a lista antes de adicionar
        if (notes.length === 0) {
            personalNotesList.innerHTML = '<li class="text-slate-400">Nenhuma anotação ainda. Adicione uma!</li>';
            return;
        }

        notes.forEach(note => {
            const li = document.createElement('li');
            li.className = 'flex items-center justify-between bg-slate-700 p-3 rounded-lg mb-2 shadow-inner';
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
    if (!newPersonalNoteInput || !currentUserId) return;

    const content = newPersonalNoteInput.value.trim();
    if (!content) {
        window.showMessageModal('Por favor, digite o conteúdo da anotação.');
        return;
    }

    try {
        const { error } = await supabase
            .from('personal_notes')
            .insert([{ user_id: currentUserId, content: content }]);

        if (error) throw error;

        newPersonalNoteInput.value = ''; // Limpa o input
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
    window.showMessageModal('Editar Anotação:', 'confirm', async () => {
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
    window.showMessageModal('Tem certeza que deseja excluir esta anotação?', 'confirm', async () => {
        try {
            const { error } = await supabase
                .from('personal_notes')
                .delete()
                .eq('id', noteId)
                .eq('user_id', currentUserId); // Ensure only the owner can delete

            if (error) throw error;

            window.showMessageModal('Anotação excluída com sucesso!');
            await loadPersonalNotes(); // Recarrega a lista
        } catch (error) {
            console.error('Erro ao excluir anotação pessoal:', error.message);
            window.showMessageModal(`Erro ao excluir anotação: ${error.message}`);
        }
    });
};

// --- Funções para outras abas (mantidas do seu código original) ---

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
            learningsList.innerHTML = '<li class="text-slate-400">Nenhum aprendizado ou caso técnico registrado ainda.</li>';
            return;
        }

        learnings.forEach(learning => {
            const li = document.createElement('li');
            li.className = 'flex items-start justify-between bg-slate-700 p-3 rounded-lg mb-2 shadow-inner';
            li.setAttribute('data-learning-id', learning.id);
            li.innerHTML = `
                <div class="flex-grow">
                    <p class="font-semibold text-yellow-custom">${learning.title}</p>
                    <p class="text-white text-sm mt-1">${learning.description}</p>
                    ${learning.category ? `<p class="text-slate-400 text-xs mt-1">Categoria: ${learning.category}</p>` : ''}
                </div>
                ${window.userProfile && window.userProfile.role === 'supervisor' ? `
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
    if (window.userProfile && window.userProfile.role !== 'supervisor') {
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
    if (window.userProfile && window.userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para editar aprendizados.');
        return;
    }

    window.showMessageModal('Editar Aprendizado/Caso Técnico:', 'confirm', async () => {
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
    if (window.userProfile && window.userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para excluir aprendizados.');
        return;
    }

    window.showMessageModal('Tem certeza que deseja excluir este aprendizado/caso técnico?', 'confirm', async () => {
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
            alignmentsList.innerHTML = '<li class="text-slate-400">Nenhum alinhamento registrado ainda.</li>';
            return;
        }

        alignments.forEach(alignment => {
            const li = document.createElement('li');
            li.className = 'flex items-start justify-between bg-slate-700 p-3 rounded-lg mb-2 shadow-inner';
            li.setAttribute('data-alignment-id', alignment.id);
            li.innerHTML = `
                <div class="flex-grow">
                    <p class="font-semibold text-yellow-custom">${alignment.title}</p>
                    <p class="text-white text-sm mt-1">${alignment.description}</p>
                    <p class="text-slate-400 text-xs mt-1">Data: ${new Date(alignment.date).toLocaleDateString('pt-BR')}</p>
                </div>
                ${window.userProfile && window.userProfile.role === 'supervisor' ? `
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
    if (window.userProfile && window.userProfile.role !== 'supervisor') {
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
    if (window.userProfile && window.userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para editar alinhamentos.');
        return;
    }

    window.showMessageModal('Editar Alinhamento:', 'confirm', async () => {
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
    if (window.userProfile && window.userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para excluir alinhamentos.');
        return;
    }

    window.showMessageModal('Tem certeza que deseja excluir este alinhamento?', 'confirm', async () => {
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
            goalsList.innerHTML = '<li class="text-slate-400">Nenhuma meta registrada ainda.</li>';
            return;
        }

        goals.forEach(goal => {
            const li = document.createElement('li');
            li.className = 'flex items-start justify-between bg-slate-700 p-3 rounded-lg mb-2 shadow-inner';
            li.setAttribute('data-goal-id', goal.id);
            li.innerHTML = `
                <div class="flex-grow">
                    <p class="font-semibold text-yellow-custom">${goal.description}</p>
                    ${goal.due_date ? `<p class="text-slate-400 text-xs mt-1">Prazo: ${new Date(goal.due_date).toLocaleDateString('pt-BR')}</p>` : ''}
                    <p class="text-slate-400 text-xs mt-1">Status: ${goal.completed ? 'Concluída' : 'Pendente'}</p>
                </div>
                ${window.userProfile && window.userProfile.role === 'supervisor' ? `
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
    if (window.userProfile && window.userProfile.role !== 'supervisor') {
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
    if (window.userProfile && window.userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para editar metas.');
        return;
    }

    window.showMessageModal('Editar Meta:', 'confirm', async () => {
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
    if (window.userProfile && window.userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para excluir metas.');
        return;
    }

    window.showMessageModal('Tem certeza que deseja excluir esta meta?', 'confirm', async () => {
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
            ramaisList.innerHTML = '<li class="text-slate-400">Nenhum ramal/grupo registrado ainda.</li>';
            return;
        }

        ramais.forEach(ramal => {
            const li = document.createElement('li');
            li.className = 'flex items-start justify-between bg-slate-700 p-3 rounded-lg mb-2 shadow-inner';
            li.setAttribute('data-ramal-id', ramal.id);
            li.innerHTML = `
                <div class="flex-grow">
                    <p class="font-semibold text-yellow-custom">${ramal.name}</p>
                    <p class="text-white text-sm mt-1">Número: ${ramal.number}</p>
                    ${ramal.group_name ? `<p class="text-slate-400 text-xs mt-1">Grupo: ${ramal.group_name}</p>` : ''}
                </div>
                ${window.userProfile && window.userProfile.role === 'supervisor' ? `
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
    if (window.userProfile && window.userProfile.role !== 'supervisor') {
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
    if (window.userProfile && window.userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para editar ramais.');
        return;
    }

    window.showMessageModal('Editar Ramal/Grupo:', 'confirm', async () => {
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
    if (window.userProfile && window.userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para excluir ramais.');
        return;
    }

    window.showMessageModal('Tem certeza que deseja excluir este ramal/grupo?', 'confirm', async () => {
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
            linksList.innerHTML = '<li class="text-slate-400">Nenhum link útil registrado ainda.</li>';
            return;
        }

        links.forEach(link => {
            const li = document.createElement('li');
            li.className = 'flex items-start justify-between bg-slate-700 p-3 rounded-lg mb-2 shadow-inner';
            li.setAttribute('data-link-id', link.id);
            li.innerHTML = `
                <div class="flex-grow">
                    <a href="${link.url}" target="_blank" class="font-semibold text-yellow-custom hover:underline">${link.title}</a>
                    <p class="text-white text-sm mt-1">${link.url}</p>
                    ${link.category ? `<p class="text-slate-400 text-xs mt-1">Categoria: ${link.category}</p>` : ''}
                </div>
                ${window.userProfile && window.userProfile.role === 'supervisor' ? `
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
    if (window.userProfile && window.userProfile.role !== 'supervisor') {
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
    }
    catch (error) {
        console.error('Erro ao adicionar link:', error.message);
        window.showMessageModal(`Erro ao adicionar link: ${error.message}`);
    }
};

/**
 * Edita um link útil existente. (Supervisor only)
 */
window.handleEditLink = (linkId, currentTitle, currentUrl, currentCategory) => {
    if (window.userProfile && window.userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para editar links.');
        return;
    }

    window.showMessageModal('Editar Link Útil:', 'confirm', async () => {
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
    if (window.userProfile && window.userProfile.role !== 'supervisor') {
        window.showMessageModal('Você não tem permissão para excluir links.');
        return;
    }

    window.showMessageModal('Tem certeza que deseja excluir este link útil?', 'confirm', async () => {
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

    if (window.userProfile && window.userProfile.role !== 'supervisor') {
        collaboratorProfilesList.innerHTML = '<li class="text-slate-400">Você não tem permissão para visualizar perfis de colaboradores.</li>';
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
            collaboratorProfilesList.innerHTML = '<li class="text-slate-400">Nenhum perfil de colaborador registrado ainda.</li>';
            return;
        }

        profiles.forEach(profile => {
            const li = document.createElement('li');
            li.className = 'flex items-center bg-slate-700 p-3 rounded-lg mb-2 shadow-inner';
            li.setAttribute('data-user-id', profile.user_id);
            li.innerHTML = `
                <img src="${profile.avatar_url || 'https://via.placeholder.com/32/FFD700/000000?text=JD'}" alt="Avatar" class="rounded-full w-8 h-8 mr-3">
                <div>
                    <p class="font-semibold text-yellow-custom">${profile.name || 'Nome Desconhecido'}</p>
                    <p class="text-slate-400 text-sm">${profile.role || 'Cargo Desconhecido'}</p>
                    <p class="text-slate-500 text-xs">ID: ${profile.user_id}</p>
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


// --- Event Listeners and Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    // Sidebar and Hamburger Menu functionality
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const hamburgerButton = document.getElementById('hamburger-button');

    if (hamburgerButton && sidebar && mainContent) {
        hamburgerButton.addEventListener('click', () => {
            sidebar.classList.toggle('active'); // Use 'active' to show on mobile
            mainContent.classList.toggle('expanded'); // Adjust main content padding
        });

        // Close sidebar when clicking outside on small screens
        mainContent.addEventListener('click', (event) => {
            if (window.innerWidth <= 768 && sidebar.classList.contains('active') && !sidebar.contains(event.target)) {
                sidebar.classList.remove('active');
                mainContent.classList.remove('expanded');
            }
        });

        // Adjust sidebar visibility on window resize (for larger screens)
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('active'); // Ensure sidebar is not 'active' on large screens
                mainContent.classList.remove('expanded'); // Ensure content is not 'expanded' on large screens
            }
        });
    }

    // Add event listeners for Personal Notes (if elements exist)
    if (addNoteButton) {
        addNoteButton.addEventListener('click', window.handleAddPersonalNote);
    }

    // Call checkUserSession to initiate authentication and data loading
    checkUserSession();
});

// Optional: Supabase real-time subscriptions (if you want real-time updates)
/*
supabase
  .channel('public:personal_notes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'personal_notes' }, payload => {
    console.log('Change received!', payload);
    if (payload.new.user_id === currentUserId || payload.old.user_id === currentUserId) {
        loadPersonalNotes(); // Reload notes on changes relevant to the current user
    }
  })
  .subscribe();
*/
