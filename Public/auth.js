// public/auth.js
async function postJSON(url, payload) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'same-origin'
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (data && data.message) ? data.message : `HTTP error ${res.status}`;
      return { success: false, message: msg };
    }
    return data;
  } catch (err) {
    console.error('postJSON error:', err);
    return { success: false, message: 'Failed to connect to server.' };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msgEl = document.getElementById('msg');
      msgEl.style.color = 'crimson';

      const payload = {
        firstname: document.getElementById('firstname').value.trim(),
        middlename: document.getElementById('middlename').value.trim(),
        lastname: document.getElementById('lastname').value.trim(),
        ctuid: document.getElementById('ctuid').value.trim(),
        schoolyear: document.getElementById('schoolyear').value.trim(),
        course: document.getElementById('course').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
        confirmPassword: document.getElementById('confirmPassword').value
      };

      if (!payload.firstname || !payload.lastname || !payload.ctuid || !payload.email) {
        msgEl.textContent = 'Please fill in required fields.';
        return;
      }
      if (payload.password !== payload.confirmPassword) {
        msgEl.textContent = 'Passwords do not match.';
        return;
      }

      msgEl.style.color = 'black';
      msgEl.textContent = 'Registering...';

      const res = await postJSON('/api/register', payload);
      if (res.success) {
        msgEl.style.color = 'green';
        msgEl.textContent = res.message || 'Registration successful.';
        setTimeout(() => window.location.href = 'login.html', 900);
      } else {
        msgEl.style.color = 'crimson';
        msgEl.textContent = res.message || 'Registration failed.';
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msgEl = document.getElementById('msg');
      msgEl.style.color = 'crimson';

      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const role = document.getElementById('role').value;

      if (!email || !password || !role) {
        msgEl.textContent = 'Please enter email, password and select role.';
        return;
      }

      msgEl.style.color = 'black';
      msgEl.textContent = 'Logging in...';

      const res = await postJSON('/api/login', { email, password, role });
      if (res.success) {
        msgEl.style.color = 'green';
        msgEl.textContent = 'Login successful!';
        setTimeout(() => {
          if (res.user && res.user.role === 'admin') window.location.href = 'admin-dashboard.html';
          else window.location.href = 'student-dashboard.html';
        }, 600);
      } else {
        msgEl.style.color = 'crimson';
        msgEl.textContent = res.message || 'Login failed.';
      }
    });
  }
});
