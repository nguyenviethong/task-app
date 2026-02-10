const express = require("express");
const sqlite = require("better-sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const db = sqlite("auth.db");

db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE,
  password TEXT
)
`).run();

const SECRET = "super-secret-key";

app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  try {
    db.prepare(`
      INSERT INTO users(email,password)
      VALUES (?,?)
    `).run(email, hash);

    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: "User exists" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = db.prepare(`
    SELECT * FROM users WHERE email=?
  `).get(email);

  if (!user) return res.status(401).json({ error: "Invalid" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "Invalid" });

  const token = jwt.sign({ id: user.id }, SECRET);

  res.json({ token });
});

app.listen(3001, () =>
  console.log("Auth server running on 3001")
);



