import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Substitua com os dados reais do seu Supabase
const supabase = createClient('https://umpufxwgaxgyhzhbjaep.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtcHVmeHdnYXhneWh6aGJqYWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNzQ3ODIsImV4cCI6MjA2ODg1MDc4Mn0.US4LPmpLb0hSPPdlCz9RJS2V0vTZX_pFN-e9-ekgIcQ')

// Function to display messages in a custom modal
function showMessageModal(message) {
    const modal = document.getElementById('messageModal');
    const modalMessage = document.getElementById('modalMessage');
    const modalButton = modal.querySelector('.modal-button'); // Get the OK button

    if (modal && modalMessage && modalButton) {
        modalMessage.textContent = message;
        modalButton.textContent = "OK"; // Ensure it's "OK" for simple messages
        modalButton.onclick = () => { // Set its click handler to just close
            modal.style.display = 'none';
        };
        // Ensure no cancel button is visible for simple messages
        let cancelButton = modal.querySelector('#modalCancelButton');
        if (cancelButton) {
            cancelButton.style.display = 'none';
        }
        modal.style.display = 'flex'; // Use flex to center the modal content
    }
}

document.getElementById('login-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const tipo = document.getElementById('tipo').value; // Get the selected type

    // Basic validation for the 'tipo' field
    if (tipo === "") {
        showMessageModal('Por favor, selecione o tipo de usuário (Colaborador ou Supervisor).');
        return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        showMessageModal('Erro ao fazer login: ' + error.message);
        return;
    }

    // Salvar o tipo de usuário no localStorage
    localStorage.setItem('userRole', tipo);

    // Login bem-sucedido, redirecionar
    window.location.href = '/login/dashboard_layout/index.html'; // Certifique-se de que este caminho está correto
});

// Após login bem-sucedido
const { data: { user } } = await supabase.auth.getUser()

if (user) {
  const { data: userData, error: userError } = await supabase
    .from('usuarios') // Nome da sua tabela
    .select('funcao') // Campo onde está "colaborador" ou "supervisor"
    .eq('id', user.id) // Ou use .eq('email', user.email) se usar email
    .single()

  if (!userError && userData) {
    localStorage.setItem('userRole', userData.funcao)
  }
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('messageModal');
    // Only close if the click is outside the modal content AND it's not a confirmation modal
    // Check if the "OK" button's text is "OK" (for simple messages)
    const modalButton = modal.querySelector('.modal-button');
    if (event.target === modal && modalButton && modalButton.textContent === "OK") {
        modal.style.display = "none";
    }
}
