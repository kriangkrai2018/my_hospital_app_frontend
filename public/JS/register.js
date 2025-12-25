document.addEventListener('DOMContentLoaded', () => {
    const regDeptSelect = document.getElementById('department');
    const messageElement = document.getElementById('message');

    // Fetch and populate department dropdown on page load
    async function fetchDepartments() {
        try {
            const response = await fetch('/api/auth/departments');
            if (!response.ok) {
                console.error('Failed to fetch departments:', response.status, response.statusText);
                messageElement.textContent = 'ไม่สามารถดึงรายชื่อแผนกได้ กรุณาลองใหม่อีกครั้ง';
                messageElement.style.color = 'red';
                return;
            }
            const departments = await response.json();
            regDeptSelect.innerHTML = '<option value="">-- เลือกแผนก --</option>';
            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.id;
                option.textContent = dept.name;
                regDeptSelect.appendChild(option);
            });
            if (departments.length === 0) {
                messageElement.textContent = 'ไม่พบแผนกในระบบ กรุณาติดต่อผู้ดูแลระบบ';
                messageElement.style.color = 'orange';
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
            messageElement.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
            messageElement.style.color = 'red';
        }
    }

    // (⭐⭐⭐ แก้ไข: อ่านค่าจากฟิลด์ใหม่ และส่งไปใน fetch ⭐⭐⭐)
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. อ่านค่าจากฟิลด์ใหม่
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const department_id = regDeptSelect.value;
        const fullname = document.getElementById('fullname').value.trim();
        const position = document.getElementById('position').value.trim();
        const phone = document.getElementById('phone').value.trim();

        // 2. อัปเดตการตรวจสอบ
        if (!username || !password || !department_id || !fullname) {
            messageElement.textContent = 'กรุณากรอกข้อมูล (ชื่อผู้ใช้, รหัสผ่าน, แผนก, ชื่อ-นามสกุล) ให้ครบ';
            messageElement.style.color = 'red';
            return;
        }

        // 3. ส่งข้อมูลไปที่ API
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // 4. เพิ่มฟิลด์ใหม่ใน body
                body: JSON.stringify({
                    username: username,
                    password: password,
                    department_id: department_id,
                    fullname: fullname,
                    position: position,
                    phone: phone
                })
            });

            const result = await response.json();
            messageElement.textContent = result.message;

            if (response.ok) {
                messageElement.style.color = 'green';
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                messageElement.style.color = 'red';
            }
        } catch (error) {
            console.error('Error during registration:', error);
            messageElement.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
            messageElement.style.color = 'red';
        }
    });

    fetchDepartments();
});