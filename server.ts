import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

// --- Configuration ---
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';
const ADMIN_REGISTRATION_CODE = 'ADMIN123'; // Simple code for demo purposes

// --- Database Setup ---
const db = new Database('library.db');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'staff')) NOT NULL,
    campus TEXT NOT NULL,
    grade TEXT, -- Nullable for admins if they don't teach
    reset_token TEXT
  );

  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unique_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    author TEXT,
    category TEXT,
    status TEXT CHECK(status IN ('available', 'borrowed', 'lost')) DEFAULT 'available',
    borrower_id INTEGER,
    due_date TEXT,
    FOREIGN KEY (borrower_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    type TEXT CHECK(type IN ('borrow', 'return')) NOT NULL,
    date TEXT NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// --- Express App Setup ---
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(cookieParser());

// --- Middleware ---
const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') return res.sendStatus(403);
  next();
};

// --- API Routes ---

// Auth
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role, campus, grade, adminCode } = req.body;

  if (role === 'admin' && adminCode !== ADMIN_REGISTRATION_CODE) {
    return res.status(403).json({ error: 'Invalid Admin Registration Code' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO users (name, email, password_hash, role, campus, grade) VALUES (?, ?, ?, ?, ?, ?)');
    const info = stmt.run(name, email, hashedPassword, role, campus, grade || null);
    
    // Auto-login
    const token = jwt.sign({ id: info.lastInsertRowid, role, name, campus }, JWT_SECRET, { expiresIn: '8h' });
    res.cookie('token', token, { httpOnly: true, sameSite: 'strict' });
    res.json({ success: true, user: { id: info.lastInsertRowid, name, email, role, campus, grade } });
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password, campus } = req.body;
  
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  
  if (!user) return res.status(400).json({ error: 'User not found' });
  
  // Optional: Enforce campus check on login? 
  // The prompt says "select the campus they are from". 
  // We can verify if the selected campus matches the user's registered campus.
  if (user.campus !== campus) {
    return res.status(403).json({ error: `This account belongs to ${user.campus} campus, not ${campus}.` });
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

  const token = jwt.sign({ id: user.id, role: user.role, name: user.name, campus: user.campus }, JWT_SECRET, { expiresIn: '8h' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'strict' });
  res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, campus: user.campus, grade: user.grade } });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

app.get('/api/auth/me', authenticateToken, (req: any, res) => {
  const user = db.prepare('SELECT id, name, email, role, campus, grade FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.sendStatus(404);
  res.json({ user });
});

app.post('/api/auth/reset-password', async (req, res) => {
  // Mock implementation
  const { email, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hashedPassword, email);
  res.json({ success: true, message: 'Password reset successfully' });
});

// Books
app.get('/api/books', authenticateToken, (req: any, res) => {
  const { search, status } = req.query;
  let query = 'SELECT books.*, users.name as borrower_name FROM books LEFT JOIN users ON books.borrower_id = users.id WHERE 1=1';
  const params = [];

  if (req.user.role !== 'admin') {
    // Staff only see available books OR books they borrowed
    // Actually, prompt says: "when a user logins in they will only see the books they have borrowed"
    // But they probably need to see available books to know what they can borrow?
    // "only see the books they have borrowed and only the admin can view all the others"
    // This implies strict visibility.
    query += ' AND books.borrower_id = ?';
    params.push(req.user.id);
  } else {
    // Admin sees all
    if (status) {
      query += ' AND books.status = ?';
      params.push(status);
    }
  }

  if (search) {
    query += ' AND (books.title LIKE ? OR books.unique_code LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const books = db.prepare(query).all(...params);
  res.json({ books });
});

app.post('/api/books/bulk', authenticateToken, requireAdmin, (req, res) => {
  const { prefix, start, end, title, author, category } = req.body;
  const startNum = parseInt(start);
  const endNum = parseInt(end);
  
  if (isNaN(startNum) || isNaN(endNum) || startNum > endNum) {
    return res.status(400).json({ error: 'Invalid range' });
  }

  const insert = db.prepare('INSERT INTO books (unique_code, title, author, category) VALUES (?, ?, ?, ?)');
  const transaction = db.transaction(() => {
    for (let i = startNum; i <= endNum; i++) {
      // Pad number to 4 digits e.g., 0001
      const code = `${prefix}${i.toString().padStart(4, '0')}`;
      try {
        insert.run(code, title, author || null, category || null);
      } catch (e) {
        // Ignore duplicates or handle error
        console.warn(`Skipping duplicate code: ${code}`);
      }
    }
  });

  try {
    transaction();
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Circulation
app.post('/api/borrow', authenticateToken, (req: any, res) => {
  const { unique_code, user_id } = req.body; // Admin can specify user_id, staff uses own id
  
  const borrowerId = req.user.role === 'admin' && user_id ? user_id : req.user.id;
  
  const book = db.prepare('SELECT * FROM books WHERE unique_code = ?').get(unique_code) as any;
  
  if (!book) return res.status(404).json({ error: 'Book not found' });
  if (book.status !== 'available') return res.status(400).json({ error: 'Book is not available' });

  const update = db.prepare('UPDATE books SET status = ?, borrower_id = ?, due_date = ? WHERE id = ?');
  const log = db.prepare('INSERT INTO transactions (book_id, user_id, type, date) VALUES (?, ?, ?, ?)');

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14); // 2 weeks default

  db.transaction(() => {
    update.run('borrowed', borrowerId, dueDate.toISOString(), book.id);
    log.run(book.id, borrowerId, 'borrow', new Date().toISOString());
  })();

  res.json({ success: true });
});

app.post('/api/return', authenticateToken, (req: any, res) => {
  const { unique_code } = req.body;
  
  const book = db.prepare('SELECT * FROM books WHERE unique_code = ?').get(unique_code) as any;
  
  if (!book) return res.status(404).json({ error: 'Book not found' });
  if (book.status !== 'borrowed') return res.status(400).json({ error: 'Book is not currently borrowed' });

  // If staff is returning, ensure they are the borrower
  if (req.user.role !== 'admin' && book.borrower_id !== req.user.id) {
    return res.status(403).json({ error: 'You did not borrow this book' });
  }

  const update = db.prepare('UPDATE books SET status = ?, borrower_id = NULL, due_date = NULL WHERE id = ?');
  const log = db.prepare('INSERT INTO transactions (book_id, user_id, type, date) VALUES (?, ?, ?, ?)');

  db.transaction(() => {
    update.run('available', book.id);
    log.run(book.id, book.borrower_id, 'return', new Date().toISOString());
  })();

  res.json({ success: true });
});

// Users (Admin only)
app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, name, email, role, campus, grade FROM users').all();
  res.json({ users });
});

app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  const { name, email, password, role, campus, grade } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO users (name, email, password_hash, role, campus, grade) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(name, email, hashedPassword, role, campus, grade || null);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Reports
app.get('/api/reports/unreturned', authenticateToken, requireAdmin, (req, res) => {
  // "how many books per grade has not yet been returned"
  const report = db.prepare(`
    SELECT u.grade, COUNT(b.id) as count
    FROM books b
    JOIN users u ON b.borrower_id = u.id
    WHERE b.status = 'borrowed' AND u.grade IS NOT NULL
    GROUP BY u.grade
  `).all();
  res.json({ report });
});

// Import/Export
app.post('/api/import/books', authenticateToken, requireAdmin, upload.single('file'), (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  try {
    const records = parse(req.file.buffer, { columns: true, skip_empty_lines: true });
    const insert = db.prepare('INSERT OR IGNORE INTO books (unique_code, title, author, category) VALUES (?, ?, ?, ?)');
    
    const transaction = db.transaction(() => {
      for (const record of records as any[]) {
        insert.run(record.unique_code, record.title, record.author, record.category);
      }
    });
    
    transaction();
    res.json({ success: true, count: records.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/export/books', authenticateToken, requireAdmin, (req, res) => {
  const books = db.prepare('SELECT unique_code, title, author, category, status FROM books').all();
  const csv = stringify(books, { header: true });
  res.header('Content-Type', 'text/csv');
  res.attachment('books.csv');
  res.send(csv);
});


// --- Vite Middleware ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
