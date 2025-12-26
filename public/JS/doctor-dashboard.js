document.addEventListener('DOMContentLoaded', () => {
    let formulas = [];

    // --- Hamburger Menu Logic ---
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (hamburgerBtn && mobileMenu) {
        hamburgerBtn.addEventListener('click', () => { mobileMenu.classList.toggle('hidden'); });
        document.getElementById('profileBtn-mobile')?.addEventListener('click', () => profileBtn.click());
        document.getElementById('logout-btn-mobile')?.addEventListener('click', () => logoutBtn.click());
    }

    // --- DOM Elements ---
    const welcomeMessageEl = document.getElementById('welcomeMessage');
    const departmentMessageEl = document.getElementById('departmentMessage');
    const logoutBtn = document.getElementById('logout-btn');
    const profileBtn = document.getElementById('profileBtn');
    const formulaSelectionContainer = document.getElementById('formula-selection-container');
    
    // (⭐⭐⭐ แก้ไข 1/4: เปลี่ยน/เพิ่ม DOM Elements สำหรับ 4 แถว ⭐⭐⭐)
    const standardFormulasContainer = document.getElementById('standard-formulas-container');
    const publicDoctorFormulasWrapper = document.getElementById('public-doctor-formulas-wrapper');
    const publicDoctorFormulasContainer = document.getElementById('public-doctor-formulas-container');
    const myPrivateFormulasWrapper = document.getElementById('my-private-formulas-wrapper');
    const myPrivateFormulasContainer = document.getElementById('my-private-formulas-container');
    const sharedFormulasWrapper = document.getElementById('shared-formulas-wrapper');
    const sharedFormulasContainer = document.getElementById('shared-formulas-container');

    const doseCalculationSection = document.getElementById('dose-calculation-section');
    const rateCalculationSection = document.getElementById('rate-calculation-section');
    const variablesInputContainer = document.getElementById('variables-input-container');
    const resultDisplayArea = document.getElementById('result-display-area');
    const rateVariablesInputContainer = document.getElementById('rate-variables-input-container');
    const rateResultDisplayArea = document.getElementById('rate-result-display-area');
    const deleteFormulaBtn = document.getElementById('delete-formula-btn');
    const formulaOwnerInfo = document.getElementById('formula-owner-info');
    const profileModal = document.getElementById('profile-modal');
    const closeProfileModalBtn = document.getElementById('close-profile-modal-btn');
    const cancelProfileBtn = document.getElementById('cancel-profile-btn');
    const profileForm = document.getElementById('profile-form');
    const shareFormulaBtn = document.getElementById('share-formula-btn');

    // --- API Helper ---
    const API_BASE = 'http://127.0.0.1:36142';
    const apiRequest = async (endpoint, method = 'GET', body = null) => {
        const token = localStorage.getItem('token');
        if (!token) { window.location.href = '/login.html'; return null; }
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
        const config = { method, headers };
        if (body) config.body = JSON.stringify(body);
        try {
            const response = await fetch(`${API_BASE}${endpoint}`, config);
            if (response.status === 401 || response.status === 403) { localStorage.clear(); alert('Session หมดอายุ กรุณาล็อกอินใหม่'); window.location.href = '/login.html'; return null; }
            if (response.status === 404) { console.log(`Resource not found at ${endpoint}`); return null; }
            if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || 'API request failed'); }
            if (response.status === 204 || response.headers.get('content-length') === '0') { return { message: 'Success' }; }
            return await response.json();
        } catch (error) {
            console.error(`API Error on ${method} ${endpoint}:`, error);
            if (typeof Swal !== 'undefined') { Swal.fire({ icon: 'error', title: 'API Error', text: error.message }); }
            else { alert('API Error: ' + error.message); }
            return null;
        }
    };

    // --- Functions ---
    const loadUserProfile = async () => {
        const profile = await apiRequest('/api/auth/user-profile');
        if (profile && profile.username) {
            welcomeMessageEl.textContent = `ยินดีต้อนรับ, ${profile.username}`;
            localStorage.setItem('username', profile.username);
            if (profile.department_name) { departmentMessageEl.textContent = `แผนก: ${profile.department_name}`; }
        }
    };

    const createFormulaButton = (formula) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'formula-btn bg-white text-gray-700 rounded-lg hover:bg-blue-100 border border-gray-200 shadow-sm transition-colors';
        button.dataset.formulaId = formula.id;
        button.dataset.creatorName = formula.creator_name || '';
        const icon = document.createElement('i');
        icon.className = `${formula.icon_class || 'fas fa-pills'} text-2xl mb-2 text-gray-500 transition-colors`;
        const text = document.createElement('span');
        text.textContent = formula.name;
        button.appendChild(icon);
        button.appendChild(text);
        return button;
    };

    // (⭐⭐⭐ แก้ไข 2/4: อัปเดต loadFormulas() ให้แยก 4 ส่วน ⭐⭐⭐)
    const loadFormulas = async () => {
        const data = await apiRequest('/api/doctor/formulas');
        if (!data) {
            standardFormulasContainer.innerHTML = '<p class="text-gray-500 text-sm">ไม่สามารถโหลดสูตรยาได้</p>';
            return;
        };
        formulas = data;
        
        standardFormulasContainer.innerHTML = '';
        publicDoctorFormulasContainer.innerHTML = '';
        myPrivateFormulasContainer.innerHTML = '';
        sharedFormulasContainer.innerHTML = '';

        const loggedInUsername = localStorage.getItem('username');

        // แยกประเภทสูตร
        const standardFormulas = formulas.filter(f => f.visibility === 'public' && !f.creator_name);
        const publicDoctorFormulas = formulas.filter(f => f.visibility === 'public' && f.creator_name);
        const myPrivateFormulas = formulas.filter(f => f.visibility === 'private' && f.creator_name === loggedInUsername);
        const sharedWithMeFormulas = formulas.filter(f => f.visibility === 'private' && f.creator_name !== loggedInUsername);

        // 1. Render Standard
        if (standardFormulas.length > 0) {
            standardFormulas.forEach(f => standardFormulasContainer.appendChild(createFormulaButton(f)));
        } else {
            standardFormulasContainer.innerHTML = '<p class="text-gray-500 text-sm">ไม่พบสูตรยามาตรฐาน</p>';
        }

        // 2. Render Public Doctor
        if (publicDoctorFormulas.length > 0) {
            publicDoctorFormulasWrapper.classList.remove('hidden');
            publicDoctorFormulas.forEach(f => {
                const btn = createFormulaButton(f);
                btn.classList.add('border-green-300', 'bg-green-50'); // สีเขียวสำหรับ Public ของหมอ
                publicDoctorFormulasContainer.appendChild(btn);
            });
        } else {
            publicDoctorFormulasWrapper.classList.add('hidden');
        }

        // 3. Render My Private
        if (myPrivateFormulas.length > 0) {
            myPrivateFormulasWrapper.classList.remove('hidden');
            myPrivateFormulas.forEach(f => myPrivateFormulasContainer.appendChild(createFormulaButton(f)));
        } else {
            myPrivateFormulasWrapper.classList.add('hidden');
        }
        
        // 4. Render Shared with Me
        if (sharedWithMeFormulas.length > 0) {
            sharedFormulasWrapper.classList.remove('hidden');
            sharedWithMeFormulas.forEach(f => {
                const btn = createFormulaButton(f);
                btn.classList.add('border-blue-300', 'bg-blue-50'); // สีฟ้าสำหรับที่แชร์มา
                sharedFormulasContainer.appendChild(btn);
            });
        } else {
            sharedFormulasWrapper.classList.add('hidden');
        }
    };
    
    // (⭐⭐⭐ แก้ไข 3/4: อัปเดต generateInputFields ให้แสดงปุ่ม Share/Delete ⭐⭐⭐)
    const generateInputFields = (formulaId) => {
        variablesInputContainer.innerHTML = ''; rateVariablesInputContainer.innerHTML = '';
        resultDisplayArea.innerHTML = ''; resultDisplayArea.classList.add('hidden');
        rateResultDisplayArea.innerHTML = ''; rateResultDisplayArea.classList.add('hidden');
        doseCalculationSection.classList.add('hidden'); rateCalculationSection.classList.add('hidden');
        deleteFormulaBtn.classList.add('hidden');
        if (shareFormulaBtn) shareFormulaBtn.classList.add('hidden');
        formulaOwnerInfo.innerHTML = '';
        if (!formulaId) return;
        const selectedFormula = formulas.find(f => f.id == formulaId);
        if (!selectedFormula) return;

        // สร้าง Inputs
        if (selectedFormula.inputs && selectedFormula.inputs.length > 0) {
            doseCalculationSection.classList.remove('hidden');
            selectedFormula.inputs.forEach(input => { const div = document.createElement('div'); div.innerHTML = `<label for="input-${input.variable_name}" class="block text-sm font-medium text-gray-700">${input.display_name} (${input.unit || ''})</label><input type="number" id="input-${input.variable_name}" data-variable-name="${input.variable_name}" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" required>`; variablesInputContainer.appendChild(div); });
        }
        if (selectedFormula.rate_inputs && selectedFormula.rate_inputs.length > 0) {
            rateCalculationSection.classList.remove('hidden');
            selectedFormula.rate_inputs.forEach(input => { const div = document.createElement('div'); div.innerHTML = `<label for="rate-input-${input.variable_name}" class="block text-sm font-medium text-gray-700">${input.display_name} (${input.unit || ''})</label><input type="number" id="rate-input-${input.variable_name}" data-variable-name="${input.variable_name}" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" required>`; rateVariablesInputContainer.appendChild(div); });
        }

        // แสดงข้อมูลเจ้าของ และปุ่ม Delete/Share
        const loggedInUsername = localStorage.getItem('username');
        if (selectedFormula.creator_name) {
            // ถ้ามีผู้สร้าง (แสดงเสมอ ไม่ว่าจะ Public หรือ Private)
            formulaOwnerInfo.innerHTML = `สร้างโดย: ${selectedFormula.creator_name} (แผนก: ${selectedFormula.department_name || 'ไม่ระบุ'})`;
            
            // ถ้าเราเป็นเจ้าของ
            if (loggedInUsername === selectedFormula.creator_name) {
                deleteFormulaBtn.classList.remove('hidden');
                deleteFormulaBtn.dataset.formulaId = formulaId;
                deleteFormulaBtn.dataset.formulaName = selectedFormula.name;

                // และถ้าเป็น Private (ถึงจะแชร์ได้)
                if (selectedFormula.visibility === 'private' && shareFormulaBtn) {
                    shareFormulaBtn.classList.remove('hidden');
                    shareFormulaBtn.dataset.formulaId = formulaId;
                    shareFormulaBtn.dataset.formulaName = selectedFormula.name;
                }
            }
        }
    };

    // (⭐⭐⭐ แก้ไข 4/4: อัปเดต openShareModal ให้ดึงชื่อแผนก ⭐⭐⭐)
    const openShareModal = async (formulaId, formulaName) => {
        const [nursesInDept, currentPermissions] = await Promise.all([
            apiRequest('/api/doctor/department/nurses'),
            apiRequest(`/api/doctor/formulas/permissions/${formulaId}`)
        ]);
        if (!nursesInDept) { Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถดึงรายชื่อพยาบาลได้', 'error'); return; }
        const currentlySharedUserIds = currentPermissions?.sharedUserIds || [];
        let nurseCheckboxesHtml = '<p class="text-sm text-gray-500">ไม่พบพยาบาลในแผนกนี้</p>';
        if (nursesInDept.length > 0) {
            nurseCheckboxesHtml = nursesInDept.map(nurse => `
                <label class="flex items-center space-x-2 p-2 rounded hover:bg-gray-100">
                    <input type="checkbox" name="shareUserIds" value="${nurse.user_id}"
                           class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                           ${currentlySharedUserIds.includes(nurse.user_id) ? 'checked' : ''}>
                    <span>${nurse.username}</span>
                </label>
            `).join('');
        }
        
        // (ดึงชื่อแผนกมาจาก Element ที่เราโหลดไว้ตอนแรก)
        const deptName = departmentMessageEl.textContent.replace('แผนก: ','') || 'แผนกของคุณ';
        
        Swal.fire({
            title: `แชร์สูตรยา: ${formulaName}`,
            html: `
                <div class="text-left space-y-4 p-4">
                     <p class="text-sm text-gray-500">
                        เลือกพยาบาลในแผนก **${deptName}** ที่ต้องการแชร์สูตรยานี้ให้:
                    </p>
                    <div id="nurse-list-container" class="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1">
                        ${nurseCheckboxesHtml}
                    </div>
                     <p class="text-xs text-gray-400 mt-2">
                        หมายเหตุ: คุณ (แพทย์ผู้สร้าง) จะเห็นสูตรยานี้เสมอ
                    </p>
                </div>
            `,
            width: '500px',
            showCancelButton: true,
            confirmButtonText: 'บันทึกการแชร์',
            cancelButtonText: 'ยกเลิก',
            preConfirm: () => {
                const selectedNurseIds = Array.from(document.querySelectorAll('#nurse-list-container input[name="shareUserIds"]:checked'))
                                             .map(cb => parseInt(cb.value));
                return apiRequest(`/api/doctor/formulas/share/${formulaId}`, 'PUT', {
                    userIds: selectedNurseIds 
                });
            }
        }).then((result) => { if (result.isConfirmed && result.value) { Swal.fire('สำเร็จ!', result.value.message, 'success'); } });
    };

    // (ที่เหลือเหมือนเดิม)
    const handleDeleteFormula = async (buttonEl) => {
        const formulaId = buttonEl.dataset.formulaId; const formulaName = buttonEl.dataset.formulaName;
        Swal.fire({ title: 'ยืนยันการลบ', html: `คุณแน่ใจหรือไม่ว่าต้องการลบสูตร "<b>${formulaName}</b>"?<br>การกระทำนี้ไม่สามารถย้อนกลับได้`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonText: 'ยกเลิก', confirmButtonText: 'ใช่, ลบเลย' })
        .then(async (result) => { if (result.isConfirmed) { const response = await apiRequest(`/api/doctor/formulas/${formulaId}`, 'DELETE'); if (response && response.message) { Swal.fire('ลบแล้ว!', response.message, 'success'); generateInputFields(null); loadFormulas(); } } });
    };
    const handleCalculation = async () => {
        const activeButton = document.querySelector('.formula-btn.active'); if (!activeButton) return;
        const formulaId = activeButton.dataset.formulaId; const selectedFormula = formulas.find(f => f.id == formulaId); if (!selectedFormula) return;
        const resultDisplayArea = document.getElementById('result-display-area'); const rateResultDisplayArea = document.getElementById('rate-result-display-area');
        if (selectedFormula.inputs && selectedFormula.inputs.length > 0) {
            const inputs = {}; let allDoseInputsFilled = true;
            document.querySelectorAll('#variables-input-container input').forEach(inputEl => { if (!inputEl.value) allDoseInputsFilled = false; inputs[inputEl.dataset.variableName] = parseFloat(inputEl.value) || 0; });
            if (allDoseInputsFilled) {
                const response = await apiRequest('/api/doctor/calculate-formula', 'POST', { formulaId, inputs });
                if (response && response.result !== undefined && resultDisplayArea) { resultDisplayArea.innerHTML = `<div class="text-center py-2"><h4 class="text-lg font-semibold text-gray-700">ผลการคำนวณ:</h4><p class="text-5xl font-bold text-blue-600 my-2">${response.result} ${response.unit || ''}</p></div>`; resultDisplayArea.classList.remove('hidden'); }
            } else if (resultDisplayArea) { resultDisplayArea.classList.add('hidden'); }
        }
        if (selectedFormula.rate_inputs && selectedFormula.rate_inputs.length > 0) {
            const rateInputs = {}; let allRateInputsFilled = true;
            document.querySelectorAll('#rate-variables-input-container input').forEach(inputEl => { if (!inputEl.value) allRateInputsFilled = false; rateInputs[inputEl.dataset.variableName] = parseFloat(inputEl.value) || 0; });
            if (allRateInputsFilled) {
                const response = await apiRequest('/api/doctor/calculate-rate', 'POST', { formulaId, inputs: rateInputs });
                if (response && response.rate !== undefined && response.rate !== null && rateResultDisplayArea) { rateResultDisplayArea.innerHTML = `<div class="text-center py-2"><h4 class="text-lg font-semibold text-gray-700">ผลลัพธ์ Rate สูงสุด:</h4><p class="text-5xl font-bold text-green-600 my-2">${response.rate} ${response.unit || ''}</p></div>`; rateResultDisplayArea.classList.remove('hidden'); }
            } else if (rateResultDisplayArea) { rateResultDisplayArea.classList.add('hidden'); }
        }
    };
    const handleLogout = () => { localStorage.clear(); window.location.href = '/login.html'; };
    const showProfileModal = () => profileModal.classList.remove('hidden');
    const hideProfileModal = () => profileModal.classList.add('hidden');
    const handleFormulaButtonClick = (e) => {
        const clickedButton = e.target.closest('.formula-btn'); if (!clickedButton) return;
        document.querySelectorAll('.formula-btn').forEach(btn => { btn.classList.remove('active'); const icon = btn.querySelector('i'); if (icon) icon.classList.add('text-gray-500'); });
        clickedButton.classList.add('active'); const icon = clickedButton.querySelector('i'); if (icon) icon.classList.remove('text-gray-500');
        const formulaId = clickedButton.dataset.formulaId; generateInputFields(formulaId);
    };
    if (formulaSelectionContainer) formulaSelectionContainer.addEventListener('click', handleFormulaButtonClick);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (profileBtn) profileBtn.addEventListener('click', showProfileModal);
    if (closeProfileModalBtn) closeProfileModalBtn.addEventListener('click', hideProfileModal);
    if (cancelProfileBtn) cancelProfileBtn.addEventListener('click', hideProfileModal);
    if (profileForm) profileForm.addEventListener('submit', async (e) => {
        e.preventDefault(); const newUsername = document.getElementById('new-username').value.trim(); const newPassword = document.getElementById('new-password').value.trim();
        const body = {}; if (newUsername) body.newUsername = newUsername; if (newPassword) body.newPassword = newPassword;
        if (Object.keys(body).length === 0) { document.getElementById('profile-message').textContent = 'คุณยังไม่ได้กรอกข้อมูลใหม่'; return; }
        const response = await apiRequest('/api/auth/profile', 'PUT', body); const profileMessageEl = document.getElementById('profile-message');
        if (response && response.message) { profileMessageEl.textContent = response.message; profileMessageEl.style.color = 'green'; if(body.newUsername) localStorage.setItem('username', body.newUsername); setTimeout(hideProfileModal, 1500); }
        else { profileMessageEl.textContent = 'เกิดข้อผิดพลาด'; profileMessageEl.style.color = 'red'; }
    });
    if (shareFormulaBtn) { shareFormulaBtn.addEventListener('click', (e) => { openShareModal(e.currentTarget.dataset.formulaId, e.currentTarget.dataset.formulaName); }); }
    if (deleteFormulaBtn) { deleteFormulaBtn.addEventListener('click', (e) => { handleDeleteFormula(e.currentTarget); }); }
    document.addEventListener('input', (e) => { if (e.target.closest('#variables-input-container') || e.target.closest('#rate-variables-input-container')) { handleCalculation(); } });
    const initializeDashboard = async () => {
        await loadUserProfile();
        await loadFormulas();
        const urlParams = new URLSearchParams(window.location.search);
        const newFormulaId = urlParams.get('newFormulaId');
        if (newFormulaId) { const newFormulaBtn = document.querySelector(`.formula-btn[data-formula-id='${newFormulaId}']`); if (newFormulaBtn) { newFormulaBtn.click(); } const newUrl = window.location.pathname; window.history.replaceState({}, document.title, newUrl); }
    };
    initializeDashboard();
});