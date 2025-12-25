document.addEventListener('DOMContentLoaded', () => {
    let formulas = [];

    // --- DOM Elements ---
    const welcomeMessageEl = document.getElementById('welcomeMessage');
    const departmentMessageEl = document.getElementById('departmentMessage');
    const logoutBtn = document.getElementById('logout-btn');
    const publicFormulasContainer = document.getElementById('public-formulas-container');
    const doseCalculationSection = document.getElementById('dose-calculation-section');
    const rateCalculationSection = document.getElementById('rate-calculation-section');
    const variablesInputContainer = document.getElementById('variables-input-container');
    const resultDisplayArea = document.getElementById('result-display-area');
    const rateVariablesInputContainer = document.getElementById('rate-variables-input-container');
    const rateResultDisplayArea = document.getElementById('rate-result-display-area');

    // --- API Helper ---
    const apiRequest = async (endpoint, method = 'GET', body = null) => {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
        const config = { method, headers };
        if (body) config.body = JSON.stringify(body);
        try {
            const response = await fetch(endpoint, config);
            if (response.status === 401 || response.status === 403) {
                localStorage.clear();
                alert('Session หมดอายุ กรุณาล็อกอินใหม่');
                window.location.href = '/login.html';
                return null;
            }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'API request failed');
            }
            if(response.status === 204 || response.headers.get('content-length') === '0') {
                return null;
            }
            return await response.json();
        } catch (error) {
            console.error(`API Error on ${method} ${endpoint}:`, error);
        }
    };

    // --- Functions ---
    const loadUserProfile = async () => {
        const profile = await apiRequest('/api/auth/user-profile');
        if (profile && profile.username) {
            welcomeMessageEl.textContent = `ยินดีต้อนรับ, ${profile.username}`;
            if (profile.department_name) {
                departmentMessageEl.textContent = `แผนก: ${profile.department_name}`;
            }
        }
    };

    const createFormulaButton = (formula) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'formula-btn bg-white text-gray-700 rounded-lg hover:bg-blue-100 border border-gray-200 shadow-sm transition-colors';
        button.dataset.formulaId = formula.id;
        const icon = document.createElement('i');
        icon.className = `${formula.icon_class || 'fas fa-pills'} text-2xl mb-2 text-gray-500 transition-colors`;
        const text = document.createElement('span');
        text.textContent = formula.name;
        button.appendChild(icon);
        button.appendChild(text);
        return button;
    };

    const loadFormulas = async () => {
        const data = await apiRequest('/api/doctor/formulas');
        if (!data) return;
        formulas = data.filter(f => f.visibility === 'public');
        publicFormulasContainer.innerHTML = '';
        if (formulas.length > 0) {
            formulas.forEach(f => publicFormulasContainer.appendChild(createFormulaButton(f)));
        } else {
            publicFormulasContainer.innerHTML = '<p class="text-gray-500 text-sm">ไม่พบสูตรยามาตรฐาน</p>';
        }
    };
    
    const generateInputFields = (formulaId) => {
        variablesInputContainer.innerHTML = '';
        rateVariablesInputContainer.innerHTML = '';
        resultDisplayArea.classList.add('hidden');
        rateResultDisplayArea.classList.add('hidden');
        doseCalculationSection.classList.add('hidden');
        rateCalculationSection.classList.add('hidden');

        if (!formulaId) return;
        const selectedFormula = formulas.find(f => f.id == formulaId);
        if (!selectedFormula) return;

        if (selectedFormula.inputs && selectedFormula.inputs.length > 0) {
            doseCalculationSection.classList.remove('hidden');
            selectedFormula.inputs.forEach(input => {
                const div = document.createElement('div');
                div.innerHTML = `<label class="block text-sm font-medium text-gray-600">${input.display_name} (${input.unit || ''})</label><input type="number" data-variable-name="${input.variable_name}" class="mt-1 block w-full p-2 border border-gray-300 rounded-md" required>`;
                variablesInputContainer.appendChild(div);
            });
        }
        
        if (selectedFormula.rate_inputs && selectedFormula.rate_inputs.length > 0) {
            rateCalculationSection.classList.remove('hidden');
            selectedFormula.rate_inputs.forEach(input => {
                const div = document.createElement('div');
                div.innerHTML = `<label class="block text-sm font-medium text-gray-600">${input.display_name} (${input.unit || ''})</label><input type="number" data-variable-name="${input.variable_name}" class="mt-1 block w-full p-2 border border-gray-300 rounded-md" required>`;
                rateVariablesInputContainer.appendChild(div);
            });
        }
    };

    const handleCalculation = async () => {
    const activeButton = document.querySelector('.formula-btn.active');
    if (!activeButton) return;
    const formulaId = activeButton.dataset.formulaId;
    const selectedFormula = formulas.find(f => f.id == formulaId);
    if(!selectedFormula) return;

    // --- Dose Calculation ---
    if (selectedFormula.inputs && selectedFormula.inputs.length > 0) {
        const inputs = {};
        let allDoseInputsFilled = true;
        document.querySelectorAll('#variables-input-container input').forEach(el => {
            if (!el.value) allDoseInputsFilled = false;
            inputs[el.dataset.variableName] = parseFloat(el.value) || 0;
        });
        
        if (allDoseInputsFilled) {
            const response = await apiRequest('/api/doctor/calculate-formula', 'POST', { formulaId, inputs });
            if (response && response.result !== undefined) {
                resultDisplayArea.innerHTML = `
                    <div class="text-center py-4">
                        <h4 class="text-lg font-semibold text-gray-700">ผลการคำนวณ:</h4>
                        <p class="text-5xl font-bold text-blue-600 my-2">${response.result} ${response.unit || ''}</p>
                    </div>`;
                resultDisplayArea.classList.remove('hidden');
            }
        } else {
             resultDisplayArea.classList.add('hidden');
        }
    }
    
    // --- Rate Calculation ---
    if (selectedFormula.rate_inputs && selectedFormula.rate_inputs.length > 0) {
        const rateInputs = {};
        let allRateInputsFilled = true; // << จุดที่แก้ไขให้ถูกต้อง
        document.querySelectorAll('#rate-variables-input-container input').forEach(el => {
            if (!el.value) allRateInputsFilled = false;
            rateInputs[el.dataset.variableName] = parseFloat(el.value) || 0;
        });

        if (allRateInputsFilled) {
            const response = await apiRequest('/api/doctor/calculate-rate', 'POST', { formulaId, inputs: rateInputs });
            if (response && response.rate !== undefined && response.rate !== null) {
                rateResultDisplayArea.innerHTML = `
                    <div class="text-center py-4">
                         <h4 class="text-lg font-semibold text-gray-700">ผลลัพธ์ Rate สูงสุด:</h4>
                         <p class="text-5xl font-bold text-green-600 my-2">${response.rate} ${response.unit || ''}</p>
                    </div>`;
                rateResultDisplayArea.classList.remove('hidden');
            }
        } else {
             rateResultDisplayArea.classList.add('hidden');
        }
    }
};
    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/login.html';
    };

    const handleFormulaButtonClick = (e) => {
        const clickedButton = e.target.closest('.formula-btn');
        if (!clickedButton) return;
        document.querySelectorAll('.formula-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.querySelector('i').classList.add('text-gray-500');
        });
        clickedButton.classList.add('active');
        clickedButton.querySelector('i').classList.remove('text-gray-500');
        const formulaId = clickedButton.dataset.formulaId;
        generateInputFields(formulaId);
    };

    // --- Event Listeners ---
    logoutBtn.addEventListener('click', handleLogout);
    publicFormulasContainer.addEventListener('click', handleFormulaButtonClick);
    variablesInputContainer.addEventListener('input', handleCalculation);
    rateVariablesInputContainer.addEventListener('input', handleCalculation);
    
    // --- Initial Load ---
    const initializeDashboard = async () => {
        await loadUserProfile();
        await loadFormulas();
    };

    initializeDashboard();
});