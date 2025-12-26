document.addEventListener('DOMContentLoaded', () => {
    let state = { variables: [], activeTab: 'dose', doseLogic: [], rateLogic: [] };

    const DOMElements = {
        addFormulaForm: document.getElementById('addFormulaForm'),
        formulaName: document.getElementById('formulaName'),
        formulaDetail: document.getElementById('formulaDetail'),
        resultUnit: document.getElementById('resultUnit'),
        // (⭐⭐⭐ แก้ไข 1/2: เพิ่ม Element ของ Visibility ⭐⭐⭐)
        formulaVisibility: document.getElementById('formulaVisibility'), 
        variablesContainer: document.getElementById('variables-container'),
        addVariableBtn: document.getElementById('addVariableBtn'),
        componentPalette: document.getElementById('componentPalette'),
        tabDose: document.getElementById('tab-dose'),
        tabRate: document.getElementById('tab-rate'),
        builderAreaDose: document.getElementById('builder-area-dose'),
        builderAreaRate: document.getElementById('builder-area-rate'),
        previewDose: document.getElementById('preview-dose'),
        previewRate: document.getElementById('preview-rate'),
        formMessage: document.getElementById('formMessage'),
        livePreviewArea: document.getElementById('live-preview-area'),
        sampleInputsContainer: document.getElementById('sample-inputs-container'),
        sampleResultDisplay: document.getElementById('sample-result-display'),
    };

    // --- Helper Functions for Live Feedback ---
    function evaluate(logic, inputs) {
        if (!logic || logic.length === 0) return 0;
        const firstBlock = logic[0] || {};
        if (firstBlock.type === 'special_case') { return `[ผลลัพธ์จากสูตรพิเศษ: ${firstBlock.id}]`; }
        const conditionalBlock = logic.find(block => block.type === 'conditional');
        if (conditionalBlock) { return '[ไม่รองรับการทดสอบสูตรแบบมีเงื่อนไข]'; }
        const stringBlock = logic.find(block => block.type === 'string');
        if (stringBlock && logic.length === 1) { return stringBlock.value; }
        let expression = logic.map(block => {
            switch (block.type) {
                case 'variable': return inputs[block.id] || 0;
                case 'constant': return block.value;
                case 'operator': return block.value;
                case 'parenthesis': return block.value;
                default: return '';
            }
        }).join(' ');
        try {
            const result = new Function(`return ${expression}`)();
            return typeof result === 'number' && !isNaN(result) ? result : 'สูตรผิดพลาด';
        } catch (e) {
            return 'สูตรผิดพลาด';
        }
    }

    const translateLogicToString = (logicArray, variables) => {
        if (!logicArray || logicArray.length === 0) return 'ลากองค์ประกอบมาวางเพื่อสร้างสูตร';
        const specialCase = logicArray.find(b => b.type === 'special_case');
        if (specialCase) return `สูตรพิเศษ: ${specialCase.id}`;
        return logicArray.map(block => {
            switch (block.type) {
                case 'variable': const variable = variables.find(v => v.id === block.id); return variable ? variable.name : block.id;
                case 'constant': case 'operator': case 'parenthesis': return block.value;
                case 'conditional': return '[IF]';
                case 'string': return `"${block.value}"`;
                default: return '';
            }
        }).join(' ');
    };

    const updateLiveFeedback = () => {
        const activeLogic = getActiveLogic();
        const activeVariables = state.variables.filter(v => v.name);
        DOMElements.livePreviewArea.textContent = translateLogicToString(activeLogic, activeVariables);
        DOMElements.sampleInputsContainer.innerHTML = '';
        const sampleInputs = {};
        if (activeVariables.length > 0) {
            activeVariables.forEach(v => {
                const inputGroup = document.createElement('div');
                inputGroup.innerHTML = `<label class="block text-sm font-medium text-gray-600">${v.name}</label><input type="number" data-variable-id="${v.id}" class="sample-input mt-1 block w-full p-2 border border-gray-300 rounded-md" value="0">`;
                DOMElements.sampleInputsContainer.appendChild(inputGroup);
                sampleInputs[v.id] = 0;
            });
        } else {
            DOMElements.sampleInputsContainer.innerHTML = '<p class="text-sm text-gray-500 col-span-2">กรุณากำหนดตัวแปร (Inputs) ก่อน</p>';
        }
        const performSampleCalculation = () => {
            document.querySelectorAll('.sample-input').forEach(input => { sampleInputs[input.dataset.variableId] = parseFloat(input.value) || 0; });
            const result = evaluate(activeLogic, sampleInputs);
            if (typeof result === 'number') { DOMElements.sampleResultDisplay.textContent = result.toFixed(4); DOMElements.sampleResultDisplay.classList.remove('text-red-600'); DOMElements.sampleResultDisplay.classList.add('text-blue-600'); }
            else { DOMElements.sampleResultDisplay.textContent = result; DOMElements.sampleResultDisplay.classList.add('text-red-600'); DOMElements.sampleResultDisplay.classList.remove('text-blue-600'); }
        };
        DOMElements.sampleInputsContainer.removeEventListener('input', performSampleCalculation);
        DOMElements.sampleInputsContainer.addEventListener('input', performSampleCalculation);
        performSampleCalculation();
    };

    // --- Utility & Initialisation Functions ---
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('editId');

    const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || 'http://127.0.0.1:36142';
    const initEditMode = async (formulaId) => {
        document.querySelector('h2').innerHTML = '<i class="fas fa-pencil-alt mr-2"></i> แก้ไขสูตรยา';
        document.title = 'แก้ไขสูตรยา';
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden'; hiddenInput.id = 'formulaId'; hiddenInput.value = formulaId;
        DOMElements.addFormulaForm.appendChild(hiddenInput);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE}/api/admin/formulas/builder-data/${formulaId}`, { headers: { 'Authorization': `Bearer ${token}` }});
            if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลสูตรยาได้');
            const data = await res.json();
            DOMElements.formulaName.value = data.name;
            DOMElements.formulaDetail.value = data.description;
            DOMElements.resultUnit.value = data.result_unit;
            DOMElements.formulaVisibility.value = data.visibility; // <-- โหลดค่า visibility เดิม
            state.variables = data.calculation_data.variables;
            state.doseLogic = data.calculation_data.doseLogic || [];
            state.rateLogic = data.calculation_data.rateLogic || [];
            render();
        } catch (error) {
            showMessage(error.message);
        }
    };
    if (editId) { initEditMode(editId); }
    
    const generateUniqueId = () => `var_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const getActiveLogic = () => state.activeTab === 'dose' ? state.doseLogic : state.rateLogic;
    const getObjectFromPath = (path) => { let current = getActiveLogic(); const parts = path.split('.').filter(p => p !== ''); for (let i = 0; i < parts.length; i++) { current = current[parts[i]]; } return current; };
    const showMessage = (message, type = 'error') => { DOMElements.formMessage.textContent = message; DOMElements.formMessage.className = `form-message ${type === 'success' ? 'text-green-600' : 'text-red-600'}`; };
    const autoResizeInput = (input) => { input.style.width = 'auto'; input.style.width = `${input.scrollWidth}px`; };

    // --- Render Functions ---
    const createBlockElement = (block, path) => {
        const blockEl = document.createElement('div');
        blockEl.className = 'builder-block'; blockEl.dataset.path = path;
        let content = '';
        switch (block.type) {
            case 'variable': const variable = state.variables.find(v => v.id === block.id); content = `ตัวแปร: ${variable ? variable.name : 'N/A'}`; break;
            case 'constant': content = `<input type="number" class="constant-input" value="${block.value}" step="any">`; break;
            case 'operator': case 'parenthesis': content = block.value; break;
            case 'string': content = `<input type="text" class="string-literal-input" value="${block.value}">`; break;
            case 'conditional': break;
        }
        blockEl.innerHTML = `${content}<button type="button" class="delete-btn">&times;</button>`;
        return blockEl;
    };
    const renderBuilderArea = () => {
        const areas = { dose: DOMElements.builderAreaDose, rate: DOMElements.builderAreaRate };
        ['dose', 'rate'].forEach(tab => {
            const area = areas[tab]; const logic = state[tab === 'dose' ? 'doseLogic' : 'rateLogic'];
            area.innerHTML = '';
            if (logic.length === 0) { area.innerHTML = `<p class="placeholder-text">ลากองค์ประกอบมาวางที่นี่</p>`; }
            else { logic.forEach((block, index) => { area.appendChild(createBlockElement(block, `${index}`)); }); }
        });
    };
    const renderVariableInputs = () => {
        DOMElements.variablesContainer.innerHTML = '';
        if (state.variables.length > 0) {
            state.variables.forEach((v, i) => {
                const div = document.createElement('div');
                div.className = 'flex items-center gap-2';
                div.innerHTML = `<input type="text" data-index="${i}" data-key="name" value="${v.name}" placeholder="ชื่อตัวแปร (เช่น น้ำหนัก)" class="form-input flex-grow"><input type="text" data-index="${i}" data-key="unit" value="${v.unit}" placeholder="หน่วย (เช่น kg)" class="form-input w-24"><button type="button" class="remove-variable-btn action-button delete">ลบ</button>`;
                DOMElements.variablesContainer.appendChild(div);
            });
        } else { DOMElements.variablesContainer.innerHTML = '<p class="text-gray-500 text-center text-sm">เพิ่มตัวแปรที่ต้องใช้ในสูตร</p>'; }
    };
    const renderPalette = () => {
        const palette = DOMElements.componentPalette;
        palette.querySelectorAll('.variable-palette-button').forEach(btn => btn.remove());
        state.variables.forEach(v => {
            if (v.name) {
                const btn = document.createElement('button');
                btn.type = 'button'; btn.className = 'palette-button draggable variable-palette-button';
                btn.draggable = true; btn.dataset.type = 'variable'; btn.dataset.id = v.id;
                btn.textContent = v.name;
                palette.appendChild(btn);
            }
        });
    };
    const renderPreview = () => {
        DOMElements.previewDose.textContent = state.doseLogic.map(b => b.value || `[${b.type}]`).join(' ');
        DOMElements.previewRate.textContent = state.rateLogic.map(b => b.value || `[${b.type}]`).join(' ');
    };
    const render = () => { renderVariableInputs(); renderPalette(); renderBuilderArea(); renderPreview(); if (DOMElements.livePreviewArea) { updateLiveFeedback(); } };

    // --- Event Handlers ---
    const handleAddVariable = () => { state.variables.push({ id: generateUniqueId(), name: '', unit: '' }); render(); };
    const handleVariableChange = (e) => { const { index, key } = e.target.dataset; state.variables[index][key] = e.target.value; render(); };
    const handleRemoveVariable = (buttonEl) => { const index = buttonEl.previousElementSibling.previousElementSibling.dataset.index; state.variables.splice(index, 1); render(); };
    const handleTabClick = (tab) => {
        state.activeTab = tab;
        DOMElements.tabDose.classList.toggle('active', tab === 'dose');
        DOMElements.tabRate.classList.toggle('active', tab === 'rate');
        document.getElementById('tab-content-dose').classList.toggle('active', tab === 'dose');
        document.getElementById('tab-content-rate').classList.toggle('active', tab === 'rate');
        render();
    };
    const handleDragStart = (e) => { e.dataTransfer.setData('text/plain', JSON.stringify(e.target.dataset)); };
    const handleDrop = (e) => {
        e.preventDefault(); const target = e.target.closest('.builder-area'); if (!target) return;
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        const newBlock = { type: data.type };
        if(data.id) newBlock.id = data.id;
        if(data.value) newBlock.value = data.value;
        const logic = getActiveLogic(); logic.push(newBlock);
        render();
    };
    const handleInputChange = (e) => {
        const input = e.target;
        if (input.classList.contains('constant-input')) { const path = input.closest('.builder-block').dataset.path; const block = getObjectFromPath(path); block.value = parseFloat(input.value) || 0; render(); }
        if (input.classList.contains('string-literal-input')) { const path = input.closest('.builder-block').dataset.path; const block = getObjectFromPath(path); block.value = input.value; render(); }
    };
    const handleBlockActions = (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) { const path = deleteBtn.closest('.builder-block').dataset.path; const logic = getActiveLogic(); logic.splice(path, 1); render(); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) return showMessage('กรุณาล็อกอินก่อน');
        
        const formulaIdInput = document.getElementById('formulaId');
        const isEditMode = !!formulaIdInput;
        const formulaId = isEditMode ? formulaIdInput.value : null;
        
        // (⭐⭐⭐ แก้ไข 2/2: อ่านค่าจาก Select Box แทน Hardcode ⭐⭐⭐)
        const formulaData = {
            name: DOMElements.formulaName.value.trim(),
            description: DOMElements.formulaDetail.value.trim(),
            result_unit: DOMElements.resultUnit.value.trim(),
            visibility: DOMElements.formulaVisibility.value, // <-- อ่านค่าจาก Select Box
            calculation_data: {
                variables: state.variables.filter(v => v.name),
                doseLogic: state.doseLogic,
                rateLogic: state.rateLogic,
            }
        };

        if (!formulaData.name) return showMessage('กรุณากรอกชื่อสูตรยา');

        const endpoint = isEditMode ? `/api/admin/formulas/builder-data/${formulaId}` : '/api/doctor/formulas';
        const method = isEditMode ? 'PUT' : 'POST';

        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formulaData)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'เกิดข้อผิดพลาด');
            
            showMessage(isEditMode ? 'อัปเดตสูตรยาสำเร็จ!' : 'บันทึกสูตรยาสำเร็จ!', 'success');
            setTimeout(() => {
                // (แก้ไข: ถ้าเป็น Edit Mode ให้อัปเดต admin-dashboard.html เสมอ)
                const destination = isEditMode ? 'admin-dashboard.html' : `doctor-dashboard.html?newFormulaId=${data.formulaId}`;
                // (แก้ไข: ถ้าเป็น Admin ให้กลับไปหน้า Admin)
                const userRole = localStorage.getItem('userRole');
                if(userRole === 'admin') {
                     window.location.href = 'admin-dashboard.html';
                } else {
                     window.location.href = destination;
                }
            }, 1500);
        } catch (error) {
            showMessage(error.message);
        }
    };
    
    // --- Event Listeners Initialization ---
    DOMElements.addVariableBtn.addEventListener('click', handleAddVariable);
    DOMElements.variablesContainer.addEventListener('input', (e) => { if (e.target.matches('input[data-key]')) handleVariableChange(e); });
    DOMElements.variablesContainer.addEventListener('click', (e) => { const btn = e.target.closest('.remove-variable-btn'); if (btn) handleRemoveVariable(btn); });
    DOMElements.tabDose.addEventListener('click', () => handleTabClick('dose'));
    DOMElements.tabRate.addEventListener('click', () => handleTabClick('rate'));
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragover', (e) => { e.preventDefault(); });
    document.addEventListener('drop', handleDrop);
    document.addEventListener('click', handleBlockActions);
   [DOMElements.builderAreaDose, DOMElements.builderAreaRate].forEach(area => { area.addEventListener('change', handleInputChange); });
    DOMElements.addFormulaForm.addEventListener('submit', handleSubmit);
    // --- Initial Render ---
    render();
});