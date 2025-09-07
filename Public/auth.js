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
  const verifyOtpForm = document.getElementById('otpForm'); // ✅ for verify.html

  // ✅ Registration handler
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
        msgEl.textContent = res.message || 'Registration successful. Please verify your email.';
        setTimeout(() => window.location.href = 'verify.html', 1200);
      } else {
        msgEl.style.color = 'crimson';
        msgEl.textContent = res.message || 'Registration failed.';
      }
    });
  }

  // ✅ OTP Verification handler
  if (verifyOtpForm) {
    verifyOtpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msgEl = document.getElementById('msg');
      msgEl.style.color = 'crimson';

      const email = document.getElementById('email').value.trim();
      const otp = document.getElementById('otp').value.trim();

      if (!email || !otp) {
        msgEl.textContent = 'Please enter email and OTP.';
        return;
      }

      msgEl.style.color = 'black';
      msgEl.textContent = 'Verifying...';

      const res = await postJSON('/api/verify-otp', { email, otp });
      if (res.success) {
        msgEl.style.color = 'green';
        msgEl.textContent = res.message || 'Verification successful.';
        setTimeout(() => window.location.href = 'login.html', 1000);
      } else {
        msgEl.style.color = 'crimson';
        msgEl.textContent = res.message || 'Verification failed.';
      }
    });
  }

  // ✅ Login handler
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msgEl = document.getElementById('msg');
      msgEl.style.color = 'crimson';

      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const role = document.getElementById('role').value || 'student';

      if (!email || !password) {
        msgEl.textContent = 'Please enter email and password.';
        return;
      }

      msgEl.style.color = 'black';
      msgEl.textContent = 'Logging in...';

      const res = await postJSON('/api/login', { email, password, role });
      if (res.success) {
        msgEl.style.color = 'green';
        msgEl.textContent = 'Login successful! Redirecting...';
        setTimeout(() => {
          if (res.user && res.user.role === 'admin') {
            window.location.href = 'admin-dashboard.html';
          } else {
            window.location.href = 'student-dashboard.html';
          }
        }, 800);
      } else {
        msgEl.style.color = 'crimson';
        msgEl.textContent = res.message || 'Login failed.';
      }
    });
  }
});
