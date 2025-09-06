import express from "express";
import sql from "mssql";
import session from "express-session";
import path from "path";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { fileURLToPath } from "url";  // ✅ import this

// ✅ Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

// ✅ Serve static files
app.use(express.static(path.join(__dirname, "Public")));

// ✅ Default route -> login.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "login.html"));
});

// Database config
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

// Global pool for database connection
let pool;

// Connect to database with error handling
async function connectDB() {
  try {
    if (!pool || !pool.connected) {
      pool = await sql.connect(dbConfig);
      console.log("✅ Database connected successfully");
    } else {
      console.log("Database already connected");
    }
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1); // Exit if connection fails
  }
}

// Register route
app.post("/api/register", async (req, res) => {
  const { firstname, middlename, lastname, ctuid, schoolyear, course, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool
      .request()
      .input("firstname", sql.NVarChar, firstname)
      .input("middlename", sql.NVarChar, middlename || null)
      .input("lastname", sql.NVarChar, lastname)
      .input("ctuid", sql.NVarChar, ctuid)
      .input("schoolyear", sql.NVarChar, schoolyear || null)
      .input("course", sql.NVarChar, course || null)
      .input("email", sql.NVarChar, email)
      .input("password", sql.NVarChar, hashedPassword)
      .input("role", sql.NVarChar, "student")
      .query(
        "INSERT INTO Users (firstname, middlename, lastname, ctuid, schoolyear, course, email, password, role) VALUES (@firstname, @middlename, @lastname, @ctuid, @schoolyear, @course, @email, @password, @role)"
      );

    res.json({ success: true, message: "User registered successfully" });
  } catch (err) {
    console.error("Registration error:", err);
    res.json({ success: false, message: "Server error" });
  }
});

// Login route
app.post("/api/login", async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const result = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .input("role", sql.NVarChar, role)
      .query("SELECT * FROM Users WHERE email = @email AND role = @role");

    const user = result.recordset[0];
    if (!user) return res.json({ success: false, message: "User not found or role mismatch" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.json({ success: false, message: "Invalid password" });

    req.session.user = user;
    res.json({ success: true, user: { role: user.role } });
  } catch (err) {
    console.error("Login error:", err);
    res.json({ success: false, message: "Server error" });
  }
});

(async () => {
  await connectDB();

  // Start server
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
})();
