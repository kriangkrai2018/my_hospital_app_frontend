document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const messageEl = document.getElementById('message');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch('/api/auth/login', {
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
            messageEl.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
            messageEl.style.color = 'red';
        }
    });
});