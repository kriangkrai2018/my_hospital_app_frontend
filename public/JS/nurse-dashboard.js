
document.addEventListener('DOMContentLoaded', () => {
    let formulas = [];
    let allPatients = []; 

    // --- Hamburger Menu Logic ---
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (hamburgerBtn && mobileMenu) {
        hamburgerBtn.addEventListener('click', () => { mobileMenu.classList.toggle('hidden'); });
        document.getElementById('view-all-patients-btn-mobile')?.addEventListener('click', () => viewAllPatientsBtn.click());
        document.getElementById('add-patient-btn-mobile')?.addEventListener('click', () => addPatientBtn.click());
        document.getElementById('profileBtn-mobile')?.addEventListener('click', () => profileBtn.click());
        document.getElementById('logout-btn-mobile')?.addEventListener('click', () => logoutBtn.click());
    }

    // --- DOM Elements ---
    const welcomeMessageEl = document.getElementById('welcomeMessage');
    const departmentMessageEl = document.getElementById('departmentMessage');
    const logoutBtn = document.getElementById('logout-btn');
    const profileBtn = document.getElementById('profileBtn');
    const formulaSelectionContainer = document.getElementById('formula-selection-container');
    
    // (DOM Elements สำหรับ 3 แถว)
    const publicSystemFormulasContainer = document.getElementById('public-system-formulas-container');
    const privateSharedFormulasWrapper = document.getElementById('private-shared-formulas-wrapper');
    const privateSharedFormulasContainer = document.getElementById('private-shared-formulas-container');
    const publicDoctorFormulasWrapper = document.getElementById('public-doctor-formulas-wrapper');
    const publicDoctorFormulasContainer = document.getElementById('public-doctor-formulas-container');

    const doseCalculationSection = document.getElementById('dose-calculation-section');
    const rateCalculationSection = document.getElementById('rate-calculation-section');
    const formulaOwnerInfo = document.getElementById('formula-owner-info'); 
    
    const drugNameInput = document.getElementById('drug-name-input');
    const dosageInput = document.getElementById('dosage-input');
    const dispenseForm = document.getElementById('dispense-form');
    const patientNameInput = document.getElementById('patient-name');
    const patientHnInput = document.getElementById('patient-hn');
    const addPatientBtn = document.getElementById('add-patient-btn');
    const searchPatientBtn = document.getElementById('search-patient-btn');
    const patientSearchMessage = document.getElementById('patient-search-message');
    const viewAllPatientsBtn = document.getElementById('view-all-patients-btn');
    const patientListModal = document.getElementById('patient-list-modal');
    const closePatientListModalBtn = document.getElementById('close-patient-list-modal-btn');
    const patientListSearch = document.getElementById('patient-list-search');
    const patientListBody = document.getElementById('patient-list-body');
    const patientModal = document.getElementById('patient-modal');
    const closePatientModalBtn = document.getElementById('close-patient-modal-btn');
    const cancelPatientBtn = document.getElementById('cancel-patient-btn');
    const patientForm = document.getElementById('patient-form');
    const patientFormMessage = document.getElementById('patient-form-message');
    const patientDobInput = document.getElementById('patient-dob');
    const patientAgeInput = document.getElementById('patient-age');
    const fabApplyBtn = document.getElementById('fab-apply-btn');
    const dispenseModal = document.getElementById('dispense-modal');
    const closeDispenseModalBtn = document.getElementById('close-dispense-modal-btn');
    const profileModal = document.getElementById('profile-modal'); 

    // --- API Helper ---
    const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || 'http://localhost:36142';
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

    // --- Core Functions ---
    const loadUserProfile = async () => {
        const profile = await apiRequest('/api/auth/user-profile');
        if (profile && profile.username) {
            welcomeMessageEl.textContent = `ยินดีต้อนรับ, ${profile.username}`;
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

    const loadFormulas = async () => {
        const data = await apiRequest('/api/doctor/formulas');
        if (!data) {
            if (publicSystemFormulasContainer) { publicSystemFormulasContainer.innerHTML = '<p class="text-gray-500 text-sm">ไม่สามารถโหลดสูตรยาได้</p>'; }
            return;
        }
        formulas = data; 
        
        const systemPublic = formulas.filter(f => f.visibility === 'public' && !f.creator_name);
        const sharedPrivate = formulas.filter(f => f.visibility !== 'public'); 
        const doctorPublic = formulas.filter(f => f.visibility === 'public' && f.creator_name);
        
        if (publicSystemFormulasContainer) {
            publicSystemFormulasContainer.innerHTML = '';
            if (systemPublic.length > 0) {
                systemPublic.forEach(f => publicSystemFormulasContainer.appendChild(createFormulaButton(f)));
            } else {
                publicSystemFormulasContainer.innerHTML = '<p class="text-gray-500 text-sm">ไม่พบสูตรยามาตรฐาน</p>';
            }
        }

        if (privateSharedFormulasWrapper && privateSharedFormulasContainer) {
            if (sharedPrivate.length > 0) {
                privateSharedFormulasWrapper.classList.remove('hidden');
                privateSharedFormulasContainer.innerHTML = ''; 
                sharedPrivate.forEach(f => {
                    const btn = createFormulaButton(f);
                    btn.classList.add('border-yellow-300', 'bg-yellow-50'); 
                    privateSharedFormulasContainer.appendChild(btn);
                });
            } else {
                privateSharedFormulasWrapper.classList.add('hidden');
            }
        }

        if (publicDoctorFormulasWrapper && publicDoctorFormulasContainer) {
            if (doctorPublic.length > 0) {
                publicDoctorFormulasWrapper.classList.remove('hidden');
                publicDoctorFormulasContainer.innerHTML = '';
                doctorPublic.forEach(f => {
                    const btn = createFormulaButton(f);
                    btn.classList.add('border-gray-300', 'bg-gray-50'); 
                    publicDoctorFormulasContainer.appendChild(btn);
                });
            } else {
                publicDoctorFormulasWrapper.classList.add('hidden');
            }
        }
    };

    const generateInputFields = (formulaId) => {
        const currentVariablesContainer = document.getElementById('variables-input-container');
        const currentRateVariablesContainer = document.getElementById('rate-variables-input-container');
        const currentResultDisplayArea = document.getElementById('result-display-area');
        const currentRateResultDisplayArea = document.getElementById('rate-result-display-area');
        const currentFormulaOwnerInfo = document.getElementById('formula-owner-info');

        if(fabApplyBtn) fabApplyBtn.classList.add('hidden'); 

        if(currentVariablesContainer) currentVariablesContainer.innerHTML = '';
        if(currentRateVariablesContainer) currentRateVariablesContainer.innerHTML = '';
        if(currentResultDisplayArea) currentResultDisplayArea.classList.add('hidden');
        if(currentRateResultDisplayArea) currentRateResultDisplayArea.classList.add('hidden');
        if(doseCalculationSection) doseCalculationSection.classList.add('hidden');
        if(rateCalculationSection) rateCalculationSection.classList.add('hidden');
        if(currentFormulaOwnerInfo) currentFormulaOwnerInfo.innerHTML = ''; 

        if (!formulaId) return;
        const selectedFormula = formulas.find(f => f.id == formulaId);
        if (!selectedFormula) return;

        if (selectedFormula.inputs && selectedFormula.inputs.length > 0 && doseCalculationSection) {
            doseCalculationSection.classList.remove('hidden');
            let inputsContainer = doseCalculationSection.querySelector('#variables-input-container');
            if (!inputsContainer) {
                 doseCalculationSection.innerHTML = `
                    <h3 class="text-xl font-bold text-gray-800 mb-4">คำนวณสูตรยา</h3>
                    <div id="variables-input-container" class="grid grid-cols-1 sm:grid-cols-2 gap-4"></div>
                    <div id="result-display-area" class="mt-6 p-4 bg-blue-50 rounded-lg border hidden"></div>
                    <div id="formula-owner-info" class="mt-4 text-xs text-gray-400 text-right border-t pt-2"></div>`;
                 inputsContainer = doseCalculationSection.querySelector('#variables-input-container');
            } else {
                 inputsContainer.innerHTML = '';
            }
            selectedFormula.inputs.forEach(input => {
                const div = document.createElement('div');
                div.innerHTML = `<label class="block text-sm font-medium text-gray-700">${input.display_name} (${input.unit || ''})</label><input type="number" data-variable-name="${input.variable_name}" class="mt-1 block w-full p-2 border border-gray-300 rounded-md" required>`;
                inputsContainer.appendChild(div);
            });
        }

        if (selectedFormula.rate_inputs && selectedFormula.rate_inputs.length > 0 && rateCalculationSection) {
            rateCalculationSection.classList.remove('hidden');
            let rateInputsContainer = rateCalculationSection.querySelector('#rate-variables-input-container');
            if (!rateInputsContainer) {
                 rateCalculationSection.innerHTML = `
                    <h3 class="text-xl font-bold text-gray-800 mb-4">คำนวณ Rate สูงสุด</h3>
                    <div id="rate-variables-input-container" class="grid grid-cols-1 sm:grid-cols-2 gap-4"></div>
                    <div id="rate-result-display-area" class="mt-6 p-4 bg-green-50 rounded-lg border hidden"></div>`;
                 rateInputsContainer = rateCalculationSection.querySelector('#rate-variables-input-container');
            } else {
                 rateInputsContainer.innerHTML = '';
            }
            selectedFormula.rate_inputs.forEach(input => {
                const div = document.createElement('div');
                div.innerHTML = `<label class="block text-sm font-medium text-gray-700">${input.display_name} (${input.unit || ''})</label><input type="number" data-variable-name="${input.variable_name}" class="mt-1 block w-full p-2 border border-gray-300 rounded-md" required>`;
                rateInputsContainer.appendChild(div);
            });
        }
        
        const ownerInfoDiv = document.getElementById('formula-owner-info');
        if (ownerInfoDiv && selectedFormula.creator_name) {
             ownerInfoDiv.innerHTML = `สร้างโดย: ${selectedFormula.creator_name} (แผนก: ${selectedFormula.department_name || 'ไม่ระบุ'})`;
        }
    };

    const handleCalculation = async () => {
        const activeButton = document.querySelector('.formula-btn.active'); if (!activeButton) return;
        const formulaId = activeButton.dataset.formulaId; const selectedFormula = formulas.find(f => f.id == formulaId); if (!selectedFormula) return;
        
        const currentResultDisplayArea = document.getElementById('result-display-area');
        const currentRateResultDisplayArea = document.getElementById('rate-result-display-area');

        if (selectedFormula.inputs && selectedFormula.inputs.length > 0) {
            const inputs = {}; let allDoseInputsFilled = true;
            document.querySelectorAll('#variables-input-container input').forEach(inputEl => { if (!inputEl.value) allDoseInputsFilled = false; inputs[inputEl.dataset.variableName] = parseFloat(inputEl.value) || 0; });
            if (allDoseInputsFilled) {
                const response = await apiRequest('/api/doctor/calculate-formula', 'POST', { formulaId, inputs });
                if (response && response.result !== undefined && currentResultDisplayArea) {
                    currentResultDisplayArea.innerHTML = `<div class="text-center py-2"><h4 class="text-lg font-semibold text-gray-700">ผลการคำนวณ:</h4><p class="text-5xl font-bold text-blue-600 my-2">${response.result} ${response.unit || ''}</p></div>`;
                    currentResultDisplayArea.classList.remove('hidden');
                    if (fabApplyBtn) fabApplyBtn.classList.remove('hidden');
                }
            } else if (currentResultDisplayArea) { currentResultDisplayArea.classList.add('hidden'); if(fabApplyBtn) fabApplyBtn.classList.add('hidden'); }
        }

        if (selectedFormula.rate_inputs && selectedFormula.rate_inputs.length > 0) {
            const rateInputs = {}; let allRateInputsFilled = true;
            document.querySelectorAll('#rate-variables-input-container input').forEach(inputEl => { if (!inputEl.value) allRateInputsFilled = false; rateInputs[inputEl.dataset.variableName] = parseFloat(inputEl.value) || 0; });
            if (allRateInputsFilled) {
                const response = await apiRequest('/api/doctor/calculate-rate', 'POST', { formulaId, inputs: rateInputs });
                if (response && response.rate !== undefined && response.rate !== null && currentRateResultDisplayArea) {
                    currentRateResultDisplayArea.innerHTML = `<div class="text-center py-2"><h4 class="text-lg font-semibold text-gray-700">ผลลัพธ์ Rate สูงสุด:</h4><p class="text-5xl font-bold text-green-600 my-2">${response.rate} ${response.unit || ''}</p></div>`;
                    currentRateResultDisplayArea.classList.remove('hidden');
                    if (fabApplyBtn) fabApplyBtn.classList.remove('hidden');
                }
            } else if (currentRateResultDisplayArea) { currentRateResultDisplayArea.classList.add('hidden'); if(fabApplyBtn) fabApplyBtn.classList.add('hidden');}
        }
    };

    const handleLogout = () => { localStorage.clear(); window.location.href = '/login.html'; };
    const showPatientModal = () => patientModal.classList.remove('hidden');
    const hidePatientModal = () => { if(patientModal) patientModal.classList.add('hidden'); if(patientForm) patientForm.reset(); if(patientFormMessage) patientFormMessage.textContent = ''; };
    const handleFormulaButtonClick = (e) => {
        const clickedButton = e.target.closest('.formula-btn'); if (!clickedButton) return;
        document.querySelectorAll('.formula-btn').forEach(btn => { btn.classList.remove('active'); const icon = btn.querySelector('i'); if (icon) icon.classList.add('text-gray-500'); });
        clickedButton.classList.add('active'); const icon = clickedButton.querySelector('i'); if (icon) icon.classList.remove('text-gray-500');
        const formulaId = clickedButton.dataset.formulaId; generateInputFields(formulaId);
    };

    const searchPatientByHn = async () => {
        const hn = patientHnInput.value.trim();
        if (!hn) { patientNameInput.value = ''; patientSearchMessage.textContent = ''; return; }
        patientSearchMessage.textContent = 'กำลังค้นหา...'; patientSearchMessage.classList.remove('text-green-600', 'text-red-600');
        const patient = await apiRequest(`/api/doctor/patients/${hn}`); 
        if (patient && patient.fullname) { patientNameInput.value = patient.fullname; patientSearchMessage.textContent = 'พบข้อมูลผู้ป่วย'; patientSearchMessage.classList.add('text-green-600'); }
        else { patientNameInput.value = ''; patientSearchMessage.textContent = 'ไม่พบข้อมูลผู้ป่วย'; patientSearchMessage.classList.add('text-red-600'); }
    };

    // --- Patient List Modal Functions ---
    const renderPatientList = (patientsToRender) => {
        patientListBody.innerHTML = '';
        if (!patientsToRender || patientsToRender.length === 0) { patientListBody.innerHTML = '<p class="text-center text-gray-500 p-4">ไม่พบข้อมูลผู้ป่วย</p>'; return; }
        patientsToRender.forEach(patient => {
            const hasHistory = Array.isArray(patient.history) && patient.history.length > 0;
            const historyHtml = hasHistory ? patient.history.map(h => `<li class="text-sm text-gray-600 truncate"><span class="font-semibold text-gray-500">${new Date(h.dispensed_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}:</span> ${h.drug_name}</li>`).join('') : '<li class="text-xs text-gray-400 ml-4">ยังไม่มีประวัติ</li>';
            const locationTag = getLocationTag(patient.location);
            const patientCard = document.createElement('div');
            patientCard.className = 'bg-white p-4 rounded-lg shadow-sm border transition-all';
            patientCard.innerHTML = `<div class="patient-card-main-area cursor-pointer hover:bg-gray-50 -m-4 p-4 rounded-t-lg"><div class="flex items-start justify-between"><div class="flex items-center space-x-3"><div class="bg-gray-200 w-10 h-10 rounded-full flex items-center justify-center font-bold text-gray-600 flex-shrink-0">${patient.fullname ? patient.fullname.charAt(0) : '?'}</div><div><div class="font-bold text-base text-gray-800">${patient.fullname || 'N/A'}</div><div class="text-xs text-gray-500">🏥 HN: ${patient.hn || 'N/A'}</div></div></div>${locationTag}</div><div class="mt-3 pl-2 border-l-2 border-gray-200"><ul class="space-y-1"><li class="text-xs font-semibold text-gray-400">💊 ประวัติยาล่าสุด:</li>${historyHtml}</ul></div></div><div class="mt-3 pt-3 border-t flex items-center justify-end space-x-2"><button class="quick-action-history text-sm text-blue-600 hover:text-blue-800 font-medium py-1 px-3 rounded-md hover:bg-blue-100"><i class="fas fa-history mr-1"></i> ดูประวัติทั้งหมด</button><button class="quick-action-dispense text-sm text-white bg-blue-600 hover:bg-blue-700 font-medium py-1 px-3 rounded-md"><i class="fas fa-pills mr-1"></i> จ่ายยา</button></div>`;
            const mainArea = patientCard.querySelector('.patient-card-main-area'); const historyBtn = patientCard.querySelector('.quick-action-history'); const dispenseBtn = patientCard.querySelector('.quick-action-dispense');
            if (mainArea) { mainArea.addEventListener('click', () => { patientHnInput.value = patient.hn; patientNameInput.value = patient.fullname; patientListModal.classList.add('hidden'); searchPatientByHn(); }); }
            if (historyBtn) { historyBtn.addEventListener('click', (e) => { e.stopPropagation(); showFullHistoryModal(patient.hn, patient.fullname); }); }
            if (dispenseBtn) { dispenseBtn.addEventListener('click', (e) => { e.stopPropagation(); patientHnInput.value = patient.hn; patientNameInput.value = patient.fullname; patientListModal.classList.add('hidden'); if (fabApplyBtn) { fabApplyBtn.click(); } }); }
            patientListBody.appendChild(patientCard);
        });
    };
    
    const getLocationTag = (location) => {
        if (!location) return ''; let colorClasses = 'bg-gray-100 text-gray-800';
        switch (location.toUpperCase()) { case 'ICU': colorClasses = 'bg-red-100 text-red-800'; break; case 'ER': colorClasses = 'bg-orange-100 text-orange-800'; break; case 'WARD': colorClasses = 'bg-green-100 text-green-800'; break; case 'OR': colorClasses = 'bg-blue-100 text-blue-800'; break; }
        return `<span class="text-xs font-medium px-2 py-0.5 rounded-full ${colorClasses}">${location}</span>`;
    };
    
    const showFullHistoryModal = async (hn, fullname) => {
        Swal.fire({ title: `กำลังโหลดประวัติของ\n${fullname}`, text: 'กรุณารอสักครู่...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const data = await apiRequest(`/api/doctor/patient-history/${hn}`);
        if (data && data.history) {
            let historyHtml = '<p class="text-center text-gray-500">ไม่พบประวัติการจ่ายยา</p>';
            if (data.history.length > 0) {
                const historyRows = data.history.map(log => { const formattedDate = new Date(log.dispensed_at).toLocaleString('th-TH'); return `<tr class="hover:bg-gray-50"><td class="px-2 py-2 text-sm text-gray-600">${formattedDate}</td><td class="px-2 py-2 text-sm font-medium text-gray-800">${log.drug_name}</td><td class="px-2 py-2 text-sm text-gray-600">${log.dosage}</td><td class="px-2 py-2 text-sm text-gray-500">${log.doctor_name || 'N/A'}</td></tr>`; }).join('');
                historyHtml = `<div class="overflow-y-auto max-h-[50vh] mt-4 border rounded-lg"><table class="min-w-full divide-y divide-gray-200"><thead class="bg-gray-50"><tr><th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">วัน-เวลา</th><th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">ยาที่ใช้</th><th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">ปริมาณ</th><th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">ผู้จ่ายยา</th></tr></thead><tbody class="bg-white divide-y divide-gray-200">${historyRows}</tbody></table></div>`;
            }
            Swal.fire({ title: `ประวัติการจ่ายยาทั้งหมดของ\n${fullname}`, html: historyHtml, width: '900px', confirmButtonText: 'ปิด' });
        } else { Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถดึงข้อมูลประวัติได้' }); }
    };
    
    const showPatientListModal = async () => {
        patientListModal.classList.remove('hidden'); patientListSearch.value = '';
        patientListBody.innerHTML = '<p class="text-center text-gray-500">กำลังโหลดรายชื่อผู้ป่วย...</p>';
        const data = await apiRequest('/api/doctor/patients-with-history');
        if (data) { allPatients = data; renderPatientList(allPatients); }
        else { patientListBody.innerHTML = '<p class="text-center text-red-500">ไม่สามารถโหลดรายชื่อได้</p>'; }
    };

    // --- Event Listeners ---
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (formulaSelectionContainer) formulaSelectionContainer.addEventListener('click', handleFormulaButtonClick);
    if (searchPatientBtn) searchPatientBtn.addEventListener('click', searchPatientByHn);
    if (patientHnInput) patientHnInput.addEventListener('blur', searchPatientByHn);
    document.addEventListener('input', (e) => { if (e.target.closest('#variables-input-container') || e.target.closest('#rate-variables-input-container')) { handleCalculation(); } });

    if (fabApplyBtn) {
        fabApplyBtn.addEventListener('click', () => {
            const selectedFormula = formulas.find(f => f.id == document.querySelector('.formula-btn.active')?.dataset.formulaId); if (!selectedFormula) return;
            const doseResultText = document.querySelector('#result-display-area p')?.textContent; const rateResultText = document.querySelector('#rate-result-display-area p')?.textContent;
            if (rateResultText && !document.getElementById('rate-result-display-area')?.classList.contains('hidden')) { drugNameInput.value = `${selectedFormula.name} (Max Rate)`; dosageInput.value = rateResultText.trim(); }
            else if (doseResultText) { drugNameInput.value = selectedFormula.name; dosageInput.value = doseResultText.trim(); }
            dispenseModal.classList.remove('hidden'); setTimeout(() => { dispenseModal.querySelector('#patient-section').classList.remove('translate-y-full'); }, 50);
        });
    }
    if (closeDispenseModalBtn) { closeDispenseModalBtn.addEventListener('click', () => { dispenseModal.querySelector('#patient-section').classList.add('translate-y-full'); setTimeout(() => { dispenseModal.classList.add('hidden'); }, 300); }); }

    if (dispenseForm) {
        dispenseForm.addEventListener('submit', async (e) => {
            e.preventDefault(); const patientHn = patientHnInput.value.trim(); const drugName = drugNameInput.value.trim(); const dosage = dosageInput.value.trim();
            const activeButton = document.querySelector('.formula-btn.active'); const formulaId = activeButton ? activeButton.dataset.formulaId : null;
            if (!patientHn || !drugName || !dosage) { Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกข้อมูลให้ครบถ้วน' }); return; }
            const dispenseData = { patientHn, drugName, dosage, formulaId };
            const response = await apiRequest('/api/doctor/dispense', 'POST', dispenseData);
            if (response && response.message) { Swal.fire({ icon: 'success', title: 'สำเร็จ!', text: response.message, showConfirmButton: false, timer: 1500 }); drugNameInput.value = ''; dosageInput.value = ''; allPatients = []; } 
            else { Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถบันทึกข้อมูลได้' }); }
        });
    }
    
    // Patient List Modal Listeners
    if (viewAllPatientsBtn) viewAllPatientsBtn.addEventListener('click', showPatientListModal);
    if (closePatientListModalBtn) closePatientListModalBtn.addEventListener('click', () => patientListModal.classList.add('hidden'));
    if (patientListSearch) { patientListSearch.addEventListener('keyup', () => { const searchTerm = patientListSearch.value.toLowerCase(); const filteredPatients = allPatients.filter(p => p.fullname.toLowerCase().includes(searchTerm) || p.hn.toLowerCase().includes(searchTerm)); renderPatientList(filteredPatients); }); }

    // Patient Modal Listeners
    if (addPatientBtn) addPatientBtn.addEventListener('click', showPatientModal);
    if (closePatientModalBtn) closePatientModalBtn.addEventListener('click', hidePatientModal);
    if (cancelPatientBtn) cancelPatientBtn.addEventListener('click', hidePatientModal);
    if (patientForm) {
        patientForm.addEventListener('submit', async (e) => {
            e.preventDefault(); patientFormMessage.textContent = 'กำลังบันทึก...'; patientFormMessage.style.color = 'gray';
            const patientData = {
                hn: document.getElementById('patient-hn-modal').value, fullname: document.getElementById('patient-fullname').value, dob: document.getElementById('patient-dob').value, gender: document.getElementById('patient-gender').value,
                national_id: document.getElementById('patient-national-id').value, address: document.getElementById('patient-address').value, phone: document.getElementById('patient-phone').value, insurance_type: document.getElementById('patient-insurance').value,
                emergency_contact_name: document.getElementById('patient-emergency-name').value, emergency_contact_phone: document.getElementById('patient-emergency-phone').value,
            };
            const response = await apiRequest('/api/doctor/patient', 'POST', patientData); 
            if (response && response.message) { patientFormMessage.textContent = response.message; patientFormMessage.style.color = 'green'; setTimeout(hidePatientModal, 1500); }
            else { patientFormMessage.textContent = 'เกิดข้อผิดพลาดในการบันทึก'; patientFormMessage.style.color = 'red'; }
        });
    }
    if (patientDobInput) {
        patientDobInput.addEventListener('input', () => {
            if (patientDobInput.value) { const birthDate = new Date(patientDobInput.value); const today = new Date(); let age = today.getFullYear() - birthDate.getFullYear(); const m = today.getMonth() - birthDate.getMonth(); if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; } patientAgeInput.value = age >= 0 ? age : ''; }
            else { patientAgeInput.value = ''; }
        });
    }

    if (profileBtn) profileBtn.addEventListener('click', () => Swal.fire('กำลังพัฒนา', 'ฟังก์ชันจัดการโปรไฟล์กำลังอยู่ในระหว่างการพัฒนา', 'info'));
    
    const initializeDashboard = async () => {
        await loadUserProfile();
        await loadFormulas();
    };

    initializeDashboard();
});