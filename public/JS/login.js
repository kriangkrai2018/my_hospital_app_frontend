document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const messageEl = document.getElementById('message');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            // Resolve API base robustly: prefer generated config but avoid legacy 127.0.0.1:4200 hardcodes
            const configured = window.APP_CONFIG && window.APP_CONFIG.API_BASE ? window.APP_CONFIG.API_BASE : null;
            const defaultPort = '36142';
            function normalizeBase(base) {
                try {
                    const url = new URL(base);
                    // Replace 127.0.0.1 with current host if found
                    if (url.hostname === '127.0.0.1' || url.hostname === '127.0.1.1') {
                        url.hostname = window.location.hostname;
                    }
                    // Prevent legacy port 4200
                    if (url.port === '4200') url.port = defaultPort;
                    return url.origin;
                } catch (e) {
                    return null;
                }
            }
            let API_BASE = normalizeBase(configured) || (window.location.protocol + '//' + window.location.hostname + ':' + defaultPort);
            console.log('Using API_BASE =', API_BASE);
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();
            
            if (!res.ok) {
                messageEl.textContent = data.message || 'เกิดข้อผิดพลาด';
                messageEl.style.color = 'red';
                return;
            }
            
            messageEl.textContent = 'เข้าสู่ระบบสำเร็จ กำลัง chuyển hướng...';
            messageEl.style.color = 'green';

            localStorage.setItem('token', data.token);
            localStorage.setItem('userRole', data.role);
            localStorage.setItem('username', data.username);
            
            setTimeout(() => {
                if (data.role === 'admin') {
                    window.location.href = 'admin-dashboard.html';
                } else if (data.role === 'doctor') {
                    window.location.href = 'doctor-dashboard.html';
                } else if (data.role === 'nurse') { 
                    window.location.href = 'nurse-dashboard.html';
                } 
                // (⭐⭐⭐ เพิ่ม 'user' role กลับเข้ามา ⭐⭐⭐)
                else if (data.role === 'user') {
                    window.location.href = 'user-dashboard.html';
                }
                else {
                    messageEl.textContent = 'คุณไม่มีสิทธิ์เข้าถึงระบบนี้';
                    messageEl.style.color = 'red';
                    localStorage.clear();
                }
            }, 1000);

        } catch (err) {
            console.error('Login error:', err);
            // If the attempt used a legacy host, try fallback using current host + default port
            const usedApi = typeof API_BASE !== 'undefined' ? API_BASE : null;
            if (usedApi && (usedApi.includes('127.0.0.1') || usedApi.includes(':4200'))) {
                const alt = window.location.protocol + '//' + window.location.hostname + ':' + '36142';
                messageEl.textContent = 'ไม่สามารถเชื่อมต่อกับค่า API เดิม กำลังลองใช้ endpoint สำรอง...';
                messageEl.style.color = 'orange';
                try {
                    const retryRes = await fetch(`${alt}/api/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password })
                    });
                    const retryData = await retryRes.json();
                    if (retryRes.ok) {
                        localStorage.setItem('token', retryData.token);
                        localStorage.setItem('userRole', retryData.role);
                        localStorage.setItem('username', retryData.username);
                        window.location.href = (retryData.role === 'admin') ? 'admin-dashboard.html' : (retryData.role === 'doctor') ? 'doctor-dashboard.html' : (retryData.role === 'nurse') ? 'nurse-dashboard.html' : 'user-dashboard.html';
                        return;
                    } else {
                        messageEl.textContent = retryData.message || 'เกิดข้อผิดพลาดในการล็อกอิน (สำรอง)';
                        messageEl.style.color = 'red';
                        return;
                    }
                } catch (retryErr) {
                    console.error('Retry login error:', retryErr);
                    messageEl.textContent = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ (สำรอง)';
                    messageEl.style.color = 'red';
                    return;
                }
            }
            messageEl.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
            messageEl.style.color = 'red';
        }
    });
});