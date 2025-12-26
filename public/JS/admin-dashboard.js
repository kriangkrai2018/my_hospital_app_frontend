document.addEventListener('DOMContentLoaded', () => {
    let chartInstances = {};

    // =================================================================
    //  1. CONFIG & HELPERS
    // =================================================================
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const logoutBtn = document.getElementById('logoutBtn');
    const viewTitle = document.getElementById('view-title');
    const sidebar = document.getElementById('admin-sidebar');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const backdrop = document.getElementById('sidebar-backdrop');
    const breadcrumbContainer = document.getElementById('breadcrumb-container');
    
    // Mapping ชื่อหน้าจอภาษาไทย
    const viewBreadcrumbMap = {
        'dashboard': 'Dashboard',
        'user-management': 'การจัดการผู้ใช้',
        'formula-management': 'การจัดการสูตรยา',
        'patients-hub': 'ผู้ป่วยและเวชระเบียน',
        'settings': 'การจัดการแผนก',
        'system-management': 'การจัดการระบบ'
    };

    // Helper: Toggle Mobile Sidebar
    const toggleSidebar = () => {
        if (sidebar && backdrop) {
            sidebar.classList.toggle('-translate-x-full');
            backdrop.classList.toggle('hidden');
        }
    };
    if (hamburgerBtn) hamburgerBtn.addEventListener('click', toggleSidebar);
    if (backdrop) backdrop.addEventListener('click', toggleSidebar);

    // Helper: Decode JWT
    const decodeJwt = (token) => {
        try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; }
    };

    // Helper: Centralized API Request
    const API_BASE = 'http://127.0.0.1:4200';
    const apiRequest = async (endpoint, method = 'GET', body = null) => {
        const token = localStorage.getItem('token');
        if (!token) { window.location.href = 'login.html'; return null; }
        
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
        const config = { method, headers };
        if (body) config.body = JSON.stringify(body);

        try {
            const response = await fetch(`${API_BASE}/api/admin${endpoint}`, config);
            if (response.status === 401 || response.status === 403) {
                localStorage.clear();
                window.location.href = 'login.html';
                return null;
            }
            if (!response.ok) throw new Error('API request failed');
            const text = await response.text();
            return text ? JSON.parse(text) : {};
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: 'error', title: 'ข้อผิดพลาด', text: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' });
            return null;
        }
    };

    // =================================================================
    //  2. NAVIGATION SYSTEM (ID-Based Fixed)
    // =================================================================
    const navigateTo = (viewName) => {
        // 1. ระบุ ID หน้าจอทั้งหมดที่มีในระบบ
        const allViewIds = [
            'dashboard-view', 
            'user-management-view', 
            'formula-management-view', 
            'patients-hub-view', 
            'settings-view', 
            'system-management-view'
        ];

        // 2. สั่งซ่อนทุกหน้าจอก่อน (Reset)
        allViewIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });

        // 3. เอา Active ออกจากเมนูทั้งหมด
        sidebarLinks.forEach(link => link.classList.remove('active'));
        
        // 4. แสดงหน้าจอเป้าหมาย
        const targetView = document.getElementById(`${viewName}-view`);
        const targetLink = document.querySelector(`.sidebar-link[data-view="${viewName}"]`);
        
        if (targetView) {
            targetView.classList.remove('hidden');
            if (targetLink) targetLink.classList.add('active');
            
            // อัปเดต Header
            if (viewTitle) viewTitle.textContent = viewBreadcrumbMap[viewName] || 'Admin Dashboard';
            if (breadcrumbContainer) {
                breadcrumbContainer.innerHTML = viewName === 'dashboard' 
                    ? '<span class="font-medium">Dashboard</span>' 
                    : `<span class="text-gray-400">Dashboard</span> <span class="mx-2">/</span> <span class="font-medium text-gray-800">${viewBreadcrumbMap[viewName]}</span>`;
            }

            // โหลดข้อมูลเฉพาะของหน้านั้น
            loadViewData(viewName);
        }
    };

    const loadViewData = (viewName) => {
        switch(viewName) {
            case 'dashboard': loadDashboardData(); break;
            case 'user-management': loadUserData(); break;
            case 'patients-hub': loadPatientsHubData(); break;
            case 'formula-management': loadFormulaData(); break;
            case 'settings': loadSettingsData(); break;
            case 'system-management': loadSystemData(); break;
        }
    };

    // =================================================================
    //  3. VIEW CONTROLLERS
    // =================================================================

    // --- A. DASHBOARD OVERVIEW ---
    const loadDashboardData = async (startDate, endDate) => {
        // Default Date (Current Month)
        if (!startDate) startDate = document.getElementById('startDate')?.value || new Date().toISOString().split('T')[0];
        if (!endDate) endDate = document.getElementById('endDate')?.value || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
        
        // Update Filter Inputs
        if(document.getElementById('startDate')) document.getElementById('startDate').value = startDate;
        if(document.getElementById('endDate')) document.getElementById('endDate').value = endDate;

        const data = await apiRequest(`/dashboard?startDate=${startDate}&endDate=${endDate}`);
        if (!data) return;

        // KPI Cards
        if (data.usersToday !== undefined) {
            document.getElementById('stat-risk-today').innerText = data.highRiskToday || '0';
            document.getElementById('stat-calc-today').innerText = data.calcToday || '0';
            document.getElementById('stat-users-today').innerText = data.usersToday || '0';
            document.getElementById('stat-calc-month-label').innerText = `เดือนนี้: ${data.calcMonth || 0}`;
        }

        // Charts
        if (data.departmentUsage) renderChart('departmentChart', 'bar', data.departmentUsage.map(d => d.department_name), data.departmentUsage.map(d => d.usage_count), 'จำนวนผู้ใช้');
        if (data.usageInRange) renderChart('monthlyUsageChart', 'line', data.usageInRange.labels, data.usageInRange.dataPoints, 'จำนวนการคำนวณ');
        
        // Lists
        const topFormulaEl = document.getElementById('top-formulas-container');
        if (topFormulaEl && data.topFormulas) {
            topFormulaEl.innerHTML = data.topFormulas.length ? `<div class="space-y-3">${data.topFormulas.map((f, i) => `<div class="flex justify-between p-3 bg-gray-50 rounded border hover:bg-white transition"><div class="flex gap-3"><span class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex justify-center text-xs font-bold items-center">${i+1}</span><span>${f.name}</span></div><span class="font-bold text-gray-700">${f.usage_count} <span class="text-xs font-normal text-gray-400">ครั้ง</span></span></div>`).join('')}</div>` : '<p class="text-center py-4 text-gray-400">ยังไม่มีข้อมูล</p>';
        }
        
        const activityEl = document.getElementById('activity-log-container');
        if (activityEl && data.recentActivity) {
            activityEl.innerHTML = data.recentActivity.length ? data.recentActivity.map(l => `<div class="py-3 flex space-x-3 border-b last:border-0"><div class="mt-1 w-2 h-2 rounded-full bg-blue-400 flex-shrink-0"></div><div><p class="text-sm font-bold text-blue-600">${l.username} <span class="text-gray-800 font-normal">${l.action_type}</span></p><p class="text-xs text-gray-500">${l.details || '-'}</p><p class="text-[10px] text-gray-400 mt-1">${new Date(l.timestamp).toLocaleString('th-TH')}</p></div></div>`).join('') : '<p class="text-center py-4 text-gray-400">ไม่มีกิจกรรมล่าสุด</p>';
        }
    };

    const renderChart = (id, type, labels, data, label) => {
        const ctx = document.getElementById(id)?.getContext('2d');
        if (!ctx) return;
        if (chartInstances[id]) chartInstances[id].destroy();
        chartInstances[id] = new Chart(ctx, {
            type: type,
            data: { labels, datasets: [{ label, data, backgroundColor: type==='bar'?['#3b82f6','#10b981','#f59e0b','#ef4444']: 'rgba(59,130,246,0.1)', borderColor: '#3b82f6', borderWidth: 2, fill: type!=='bar', tension: 0.3 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    };

    // Dashboard Filter Event
    document.getElementById('dashboard-view').addEventListener('click', (e) => {
        if(e.target.closest('#apply-date-filter')) {
            loadDashboardData(document.getElementById('startDate').value, document.getElementById('endDate').value);
        }
    });

    // --- B. USER MANAGEMENT ---
    const loadUserData = async () => {
        const view = document.getElementById('user-management-view');
        view.innerHTML = `
        <div class="main-chart-card">
            <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div><h2 class="text-xl font-bold text-gray-800">การจัดการผู้ใช้</h2><p class="text-sm text-gray-500">จัดการสิทธิ์ สถานะ และตรวจสอบการใช้งาน</p></div>
                <div class="w-full md:w-auto"><input type="text" id="user-search-input" placeholder="🔍 ค้นหา..." class="w-full md:w-64 p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"></div>
            </div>
            <div class="overflow-x-auto rounded-lg border border-gray-200">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50"><tr><th class="px-4 py-3 text-left font-semibold text-gray-500">ผู้ใช้งาน</th><th class="px-4 py-3 text-left font-semibold text-gray-500">บทบาท</th><th class="px-4 py-3 text-center font-semibold text-gray-500">สถานะ</th><th class="px-4 py-3 text-center font-semibold text-gray-500">Actions</th></tr></thead>
                    <tbody id="userTableBody" class="bg-white divide-y divide-gray-200"><tr><td colspan="4" class="text-center py-4 text-gray-400">กำลังโหลด...</td></tr></tbody>
                </table>
            </div>
        </div>`;
        
        const users = await apiRequest('/users');
        if (users) renderUsersTable(users);
        setupUserEvents(view);
    };

    const renderUsersTable = (users) => {
        const myId = decodeJwt(localStorage.getItem('token'))?.id;
        const roleColors = { admin: 'bg-purple-100 text-purple-800', doctor: 'bg-blue-100 text-blue-800', nurse: 'bg-green-100 text-green-800', user: 'bg-gray-100 text-gray-800' };
        
        document.getElementById('userTableBody').innerHTML = users.map(user => {
            const isMe = user.user_id === myId;
            return `<tr class="hover:bg-gray-50 user-item" data-search="${user.username} ${user.fullname}">
                <td class="px-4 py-4"><div class="flex items-center"><div class="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 text-white flex items-center justify-center font-bold">${user.username.charAt(0).toUpperCase()}</div><div class="ml-3"><div class="font-medium text-gray-900">${user.username}</div><div class="text-xs text-gray-500">${user.fullname||'-'}</div></div></div></td>
                <td class="px-4 py-4"><span class="px-2 py-1 text-xs font-semibold rounded-full ${roleColors[user.role]||roleColors.user}">${user.role}</span></td>
                <td class="px-4 py-4 text-center">${isMe ? '<span class="text-xs text-gray-400">You</span>' : `<label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" class="sr-only peer status-toggle" data-id="${user.user_id}" ${user.is_approved?'checked':''}><div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div></label>`}</td>
                <td class="px-4 py-4 text-center"><div class="flex justify-center space-x-2"><button type="button" class="audit-btn text-indigo-500 hover:text-indigo-700" data-id="${user.user_id}" title="ประวัติ"><i class="fas fa-history text-lg"></i></button>${!isMe ? `<button type="button" class="edit-role-btn text-orange-400 hover:text-orange-600" data-id="${user.user_id}" data-role="${user.role}" title="แก้ไข"><i class="fas fa-user-edit text-lg"></i></button><button type="button" class="delete-user-btn text-red-400 hover:text-red-600" data-id="${user.user_id}" title="ลบ"><i class="fas fa-trash-alt text-lg"></i></button>`:''}</div></td>
            </tr>`;
        }).join('');
    };

    const setupUserEvents = (view) => {
        // Clone to remove old listeners
        const newView = view.cloneNode(true);
        view.parentNode.replaceChild(newView, view);

        newView.addEventListener('click', async (e) => {
            const auditBtn = e.target.closest('.audit-btn');
            const editBtn = e.target.closest('.edit-role-btn');
            const delBtn = e.target.closest('.delete-user-btn');

            if (auditBtn) {
                Swal.fire({ title: 'Loading...', didOpen: () => Swal.showLoading() });
                const data = await apiRequest(`/users/activity/${auditBtn.dataset.id}`);
                Swal.close();
                if(data) {
                    const list = data.activities.length ? data.activities.map(a=>`<li class="text-sm border-b py-2"><span class="font-bold text-gray-700">${a.action_type}</span>: ${a.details}<br><span class="text-xs text-gray-400">${new Date(a.timestamp).toLocaleString('th-TH')}</span></li>`).join('') : '<p class="text-center text-gray-400">ไม่มีข้อมูล</p>';
                    Swal.fire({ title: 'ประวัติการใช้งาน', html: `<ul class="text-left max-h-60 overflow-y-auto px-2">${list}</ul>`, width: 600 });
                }
            }
            if (editBtn) {
                const { value: role } = await Swal.fire({ title: 'เปลี่ยนบทบาท', input: 'select', inputOptions: {user:'User (ทั่วไป)', nurse:'Nurse (พยาบาล)', doctor:'Doctor (แพทย์)', admin:'Admin'}, inputValue: editBtn.dataset.role, showCancelButton: true });
                if (role) { await apiRequest(`/users/role/${editBtn.dataset.id}`, 'PUT', { newRole: role }); loadUserData(); Swal.fire('สำเร็จ', 'อัปเดตบทบาทแล้ว', 'success'); }
            }
            if (delBtn) {
                if ((await Swal.fire({ title: 'ยืนยันการลบ?', text: "ไม่สามารถกู้คืนได้", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'ลบเลย' })).isConfirmed) {
                    await apiRequest(`/users/delete/${delBtn.dataset.id}`, 'DELETE'); loadUserData(); Swal.fire('ลบแล้ว', '', 'success');
                }
            }
        });

        newView.addEventListener('change', async (e) => {
            if (e.target.classList.contains('status-toggle')) {
                try { 
                    await apiRequest(`/users/status/${e.target.dataset.id}`, 'PUT', { is_approved: e.target.checked }); 
                    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
                    Toast.fire({ icon: 'success', title: 'บันทึกสถานะแล้ว' });
                } catch { 
                    e.target.checked = !e.target.checked; 
                    Swal.fire('Error', 'บันทึกไม่สำเร็จ', 'error'); 
                }
            }
        });

        const searchInput = newView.querySelector('#user-search-input');
        if(searchInput) searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            newView.querySelectorAll('.user-item').forEach(row => row.style.display = row.dataset.search.toLowerCase().includes(term) ? '' : 'none');
        });
    };

    // --- C. PATIENTS HUB (Medical Card) ---
    const loadPatientsHubData = () => {
        const view = document.getElementById('patients-hub-view');
        view.innerHTML = `
            <div class="main-chart-card">
                <div class="flex justify-between items-center mb-4">
                    <div class="flex items-center gap-2"><div class="p-2 bg-blue-100 text-blue-600 rounded"><i class="fas fa-procedures"></i></div><h2 class="text-xl font-bold text-gray-800">ผู้ป่วยและเวชระเบียน</h2></div>
                    <input type="text" id="patient-search" placeholder="🔍 ค้นหา HN/ชื่อ..." class="p-2 border rounded-lg w-64">
                </div>
                <div class="overflow-x-auto rounded border"><table class="min-w-full divide-y bg-white"><thead class="bg-gray-50"><tr><th class="px-6 py-3 text-left text-gray-500">HN/สถานะ</th><th class="px-6 py-3 text-left text-gray-500">ผู้ป่วย</th><th class="px-6 py-3 text-left text-gray-500">กายภาพ</th><th class="px-6 py-3 text-center text-gray-500">จัดการ</th></tr></thead><tbody id="patientTableBody" class="divide-y"><tr><td colspan="4" class="p-4 text-center">Loading...</td></tr></tbody></table></div>
            </div>`;
        loadPatientsList();
        const search = document.getElementById('patient-search');
        if(search) search.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.patient-item').forEach(row => row.style.display = row.dataset.search.includes(term) ? '' : 'none');
        });
    };

    const loadPatientsList = async () => {
        const patients = await apiRequest('/patients');
        const tbody = document.getElementById('patientTableBody');
        if (!patients || !patients.length) { tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-400">ไม่พบข้อมูล</td></tr>'; return; }
        
        const statusColors = { 'ICU': 'bg-red-100 text-red-700 border-red-200', 'IPD': 'bg-blue-100 text-blue-700 border-blue-200', 'OPD': 'bg-green-100 text-green-700 border-green-200', 'Discharged': 'bg-gray-100 text-gray-600 border-gray-200' };
        
        tbody.innerHTML = patients.map(p => `
            <tr class="hover:bg-gray-50 patient-item transition" data-search="${p.hn.toLowerCase()} ${p.fullname.toLowerCase()}">
                <td class="px-6 py-4"><div><div class="font-bold text-gray-900">${p.hn}</div><span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${statusColors[p.status]||statusColors.OPD}">${p.status||'OPD'}</span></div></td>
                <td class="px-6 py-4"><div><div class="font-medium">${p.fullname}</div>${p.allergies ? `<div class="text-xs text-red-600 font-bold mt-1"><i class="fas fa-exclamation-circle"></i> แพ้: ${p.allergies}</div>` : ''}</div></td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    <div><i class="fas fa-weight w-4 text-center"></i> ${p.weight||'-'} kg ${!p.weight?'<i class="fas fa-exclamation-triangle text-yellow-500"></i>':''}</div>
                    <div><i class="fas fa-ruler-vertical w-4 text-center"></i> ${p.height||'-'} cm</div>
                </td>
                <td class="px-6 py-4 text-center"><button type="button" class="open-medical-card-btn bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded transition" data-id="${p.id}"><i class="fas fa-file-medical"></i> ข้อมูล</button></td>
            </tr>
        `).join('');

        tbody.addEventListener('click', (e) => {
            const btn = e.target.closest('.open-medical-card-btn');
            if(btn) openMedicalCard(btn.dataset.id);
        });
    };

    const openMedicalCard = async (id) => {
        Swal.fire({ title: 'กำลังโหลด...', didOpen: () => Swal.showLoading() });
        const [patient, history] = await Promise.all([apiRequest(`/patients/${id}`), apiRequest(`/patients/calc-history/${id}`)]);
        Swal.close();

        if(!patient) return Swal.fire('Error', 'ไม่พบข้อมูล', 'error');

        const historyHtml = history.length ? history.map(h => `<div class="flex justify-between border-b last:border-0 p-3 hover:bg-gray-50"><div><div class="text-sm font-bold text-blue-600">${h.drug_name}</div><div class="text-xs text-gray-500">สูตร: ${h.formula_name||'Manual'}</div></div><div class="text-right"><div class="font-mono text-sm bg-gray-100 px-2 rounded">${h.dosage}</div><div class="text-[10px] text-gray-400 mt-1">${new Date(h.dispensed_at).toLocaleDateString('th-TH')}</div></div></div>`).join('') : '<div class="text-center p-6 text-gray-400 flex flex-col items-center"><i class="fas fa-file-medical text-3xl mb-2 opacity-30"></i><span>ไม่มีประวัติ</span></div>';

        Swal.fire({
            title: `<div class="flex justify-between items-center border-b pb-3"><div class="flex items-center gap-2"><div class="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm"><i class="fas fa-user-injured"></i></div><span class="text-lg font-bold">Medical Card</span></div><span class="text-sm bg-gray-100 px-2 py-1 rounded text-gray-600">HN: ${patient.hn}</span></div>`,
            html: `
            <div class="text-left space-y-4 font-sans">
                <div class="grid grid-cols-2 gap-3 bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div><label class="text-xs font-bold text-gray-500 uppercase">สถานะ</label><select id="swal-status" class="w-full mt-1 p-1.5 border border-blue-200 rounded text-sm font-semibold text-blue-700 bg-white"><option value="OPD" ${patient.status=='OPD'?'selected':''}>🟢 OPD</option><option value="IPD" ${patient.status=='IPD'?'selected':''}>🔵 IPD</option><option value="ICU" ${patient.status=='ICU'?'selected':''}>🔴 ICU</option><option value="Discharged" ${patient.status=='Discharged'?'selected':''}>⚪ Discharged</option></select></div>
                    <div><label class="text-xs font-bold text-gray-500 uppercase">แพ้ยา</label><input id="swal-allergies" class="w-full mt-1 p-1.5 border border-red-200 rounded text-sm text-red-600 font-bold bg-white" value="${patient.allergies||''}" placeholder="-"></div>
                    <div><label class="text-xs text-gray-500">น้ำหนัก (kg)</label><input id="swal-weight" type="number" step="0.1" class="w-full p-1.5 border rounded text-sm text-center font-mono" value="${patient.weight||''}"></div>
                    <div><label class="text-xs text-gray-500">ส่วนสูง (cm)</label><input id="swal-height" type="number" class="w-full p-1.5 border rounded text-sm text-center font-mono" value="${patient.height||''}"></div>
                </div>
                <div>
                    <div class="flex border-b"><button type="button" id="tab-info" class="flex-1 pb-2 text-sm font-medium border-b-2 border-blue-600 text-blue-600">ข้อมูลทั่วไป</button><button type="button" id="tab-history" class="flex-1 pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">ประวัติการรักษา</button></div>
                    <div id="content-info" class="pt-3 space-y-2"><div class="grid grid-cols-2 gap-2"><div><label class="text-xs text-gray-500">ชื่อ</label><input id="swal-fullname" class="w-full p-2 border rounded text-sm bg-gray-50" value="${patient.fullname}" readonly></div><div><label class="text-xs text-gray-500">เบอร์โทร</label><input id="swal-phone" class="w-full p-2 border rounded text-sm" value="${patient.phone||''}"></div></div><div><label class="text-xs text-gray-500">ที่อยู่</label><input id="swal-address" class="w-full p-2 border rounded text-sm" value="${patient.address||''}"></div></div>
                    <div id="content-history" class="hidden pt-2"><div class="border rounded max-h-40 overflow-y-auto bg-white">${historyHtml}</div></div>
                </div>
            </div>`,
            width: 600, showCancelButton: true, confirmButtonText: '<i class="fas fa-save"></i> บันทึก', cancelButtonText: 'ปิด', confirmButtonColor: '#2563eb',
            didOpen: () => {
                const tabs = { info: document.getElementById('tab-info'), hist: document.getElementById('tab-history') };
                const contents = { info: document.getElementById('content-info'), hist: document.getElementById('content-history') };
                const switchTab = (active) => {
                    contents.info.classList.toggle('hidden', active!=='info'); contents.hist.classList.toggle('hidden', active!=='hist');
                    tabs.info.className = active==='info' ? "flex-1 pb-2 text-sm font-medium border-b-2 border-blue-600 text-blue-600" : "flex-1 pb-2 text-sm font-medium text-gray-500 hover:text-gray-700";
                    tabs.hist.className = active==='hist' ? "flex-1 pb-2 text-sm font-medium border-b-2 border-blue-600 text-blue-600" : "flex-1 pb-2 text-sm font-medium text-gray-500 hover:text-gray-700";
                };
                tabs.info.onclick = () => switchTab('info'); tabs.hist.onclick = () => switchTab('hist');
            },
            preConfirm: () => ({ hn: patient.hn, fullname: patient.fullname, status: document.getElementById('swal-status').value, weight: document.getElementById('swal-weight').value, height: document.getElementById('swal-height').value, allergies: document.getElementById('swal-allergies').value, phone: document.getElementById('swal-phone').value, address: document.getElementById('swal-address').value })
        }).then(async (res) => {
            if(res.isConfirmed) { await apiRequest(`/patients/${id}`, 'PUT', res.value); Swal.fire('Saved', '', 'success'); loadPatientsList(); }
        });
    };

    // --- D. OTHER VIEWS ---
    const loadSettingsData = async () => {
        const view = document.getElementById('settings-view');
        view.innerHTML = `<div class="main-chart-card"><h2 class="text-xl font-bold mb-4">จัดการแผนก</h2><div id="dept-list" class="space-y-2">Loading...</div></div>`;
        const depts = await apiRequest('/departments');
        document.getElementById('dept-list').innerHTML = depts.map(d => `<div class="p-3 bg-white border rounded flex justify-between items-center shadow-sm"><div><span class="font-medium">${d.name}</span> <span class="text-xs text-gray-500 ml-2">(${d.user_count} คน)</span></div><button class="text-gray-400 hover:text-red-500"><i class="fas fa-trash"></i></button></div>`).join('');
    };
    
    const loadFormulaData = () => { document.getElementById('formula-management-view').innerHTML = `<div class="main-chart-card"><div class="flex justify-between mb-4"><h2 class="text-xl font-bold">จัดการสูตรยา</h2><button class="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700" onclick="window.location.href='formula-builder.html'">+ สร้างสูตร</button></div><div class="p-8 text-center text-gray-400 border-2 border-dashed rounded-lg">ส่วนจัดการสูตรยา (Formula Management)</div></div>`; };
    const loadSystemData = () => { document.getElementById('system-management-view').innerHTML = `<div class="main-chart-card"><h2 class="text-xl font-bold mb-4">ตั้งค่าระบบ</h2><div class="space-y-4"><div class="p-4 border rounded bg-gray-50"><label class="block text-sm font-medium text-gray-700">ชื่อโรงพยาบาล</label><input type="text" class="mt-1 block w-full p-2 border rounded" value="MediCalc Hospital"></div><button class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">บันทึก</button></div></div>`; };

    // --- 4. INITIALIZATION ---
    sidebarLinks.forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); navigateTo(e.currentTarget.dataset.view); }));
    if (logoutBtn) logoutBtn.addEventListener('click', () => { localStorage.clear(); window.location.href = 'login.html'; });
    
    navigateTo('dashboard');
});