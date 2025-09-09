// server.js
import express from "express";
import sql from "mssql";
import session from "express-session";
import path from "path";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(express.static(path.join(__dirname, "public")));
app.get('/', (req, res) => {
  res.redirect('/login.html'); // Redirect / to login page
});
// ✅ Database config
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  port: parseInt(process.env.DB_PORT, 10),
};

let pool;
async function connectDB() {
  if (!pool || !pool.connected) {
    pool = await sql.connect(dbConfig);
    console.log("✅ Database connected");
  }
}

// ✅ Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ---------------------- REGISTER ----------------------
app.post("/api/register", async (req, res) => {
  const { firstname, middlename, lastname, ctuid, schoolyear, course, email, password } = req.body;
  try {
    const exists = await pool.request()
      .input("email", sql.NVarChar, email)
      .query("SELECT id FROM Users WHERE email = @email");
    if (exists.recordset.length > 0) {
      return res.json({ success: false, message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60000);

    await pool.request()
      .input("firstname", sql.NVarChar, firstname)
      .input("middlename", sql.NVarChar, middlename || null)
      .input("lastname", sql.NVarChar, lastname)
      .input("ctuid", sql.NVarChar, ctuid)
      .input("schoolyear", sql.NVarChar, schoolyear || null)
      .input("course", sql.NVarChar, course || null)
      .input("email", sql.NVarChar, email)
      .input("password", sql.NVarChar, hashedPassword)
      .input("role", sql.NVarChar, "student")
      .input("otp_code", sql.NVarChar, otp)
      .input("otp_expires", sql.DateTime, expiry)
      .query(
        `INSERT INTO Users (firstname, middlename, lastname, ctuid, schoolyear, course, email, password, role, otp_code, otp_expires, is_verified)
         VALUES (@firstname, @middlename, @lastname, @ctuid, @schoolyear, @course, @email, @password, @role, @otp_code, @otp_expires, 0)`
      );

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "CTU E-Clinic OTP Verification",
      text: `Hello ${firstname},\n\nYour OTP code is: ${otp}\nIt will expire in 10 minutes.`,
    });

    res.json({ success: true, message: "Registered successfully. Please check your email for OTP." });
  } catch (err) {
    console.error("Registration error:", err);
    res.json({ success: false, message: "Server error" });
  }
});

// ---------------------- VERIFY OTP ----------------------
app.post("/api/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const result = await pool.request()
      .input("email", sql.NVarChar, email)
      .query("SELECT otp_code, otp_expires FROM Users WHERE email = @email");
    if (!result.recordset.length) return res.json({ success: false, message: "User not found" });

    const user = result.recordset[0];
    if (user.otp_code !== otp) return res.json({ success: false, message: "Invalid OTP" });
    if (new Date() > user.otp_expires) return res.json({ success: false, message: "OTP expired" });

    await pool.request()
      .input("email", sql.NVarChar, email)
      .query("UPDATE Users SET is_verified = 1, otp_code = NULL, otp_expires = NULL WHERE email = @email");

    res.json({ success: true, message: "Email verified successfully" });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.json({ success: false, message: "Server error" });
  }
});

// ---------------------- LOGIN ----------------------
app.post("/api/login", async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const result = await pool.request()
      .input("email", sql.NVarChar, email)
      .input("role", sql.NVarChar, role)
      .query("SELECT * FROM Users WHERE email = @email AND role = @role");

    const user = result.recordset[0];
    if (!user) return res.json({ success: false, message: "User not found" });
    if (!user.is_verified) return res.json({ success: false, message: "Please verify your email first." });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.json({ success: false, message: "Invalid password" });

    req.session.user = user;
    res.json({ success: true, user: { role: user.role } });
  } catch (err) {
    console.error("Login error:", err);
    res.json({ success: false, message: "Server error" });
  }
});

// ---------------------- FORGOT PASSWORD ----------------------
app.post("/api/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const result = await pool.request()
      .input("email", sql.NVarChar, email)
      .query("SELECT id FROM Users WHERE email = @email");

    if (!result.recordset.length) {
      return res.json({ success: false, message: "No account found with that email." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60000);

    await pool.request()
      .input("email", sql.NVarChar, email)
      .input("reset_token", sql.NVarChar, otp)
      .input("reset_expires", sql.DateTime, expiry)
      .query("UPDATE Users SET reset_token = @reset_token, reset_expires = @reset_expires WHERE email = @email");

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "CTU E-Clinic Password Reset OTP",
      text: `Your OTP is: ${otp}. It expires in 15 minutes.`,
    });

    res.json({ success: true, message: "OTP sent to your email." });
  } catch (err) {
    console.error("Forgot Password error:", err);
    res.json({ success: false, message: "Server error" });
  }
});

// ---------------------- RESET PASSWORD ----------------------
app.post("/api/reset-password", async (req, res) => {
  const { otp, newPassword } = req.body;
  try {
    const result = await pool.request()
      .input("otp", sql.NVarChar, otp)
      .query("SELECT id, reset_expires FROM Users WHERE reset_token = @otp");

    if (!result.recordset.length) {
      return res.json({ success: false, message: "Invalid OTP." });
    }
    const user = result.recordset[0];
    if (new Date() > user.reset_expires) {
      return res.json({ success: false, message: "OTP expired." });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.request()
      .input("id", sql.Int, user.id)
      .input("password", sql.NVarChar, hashed)
      .query("UPDATE Users SET password = @password, reset_token = NULL, reset_expires = NULL WHERE id = @id");

    res.json({ success: true, message: "Password has been reset." });
  } catch (err) {
    console.error("Reset Password error:", err);
    res.json({ success: false, message: "Server error" });
  }
});

// ✅ Start
(async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
})();
