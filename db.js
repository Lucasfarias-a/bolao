import pg from 'pg';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const isPostgres = !!process.env.DATABASE_URL;
let pgPool = null;
let sqliteDb = null;

// Inicializa a conexão com o banco de dados
async function getDb() {
  if (isPostgres) {
    if (!pgPool) {
      pgPool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('localhost') ? false : {
          rejectUnauthorized: false
        }
      });
    }
    return pgPool;
  } else {
    if (!sqliteDb) {
      const dataDir = path.resolve('./data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      sqliteDb = await open({
        filename: path.join(dataDir, 'bets.db'),
        driver: sqlite3.Database
      });
    }
    return sqliteDb;
  }
}

// Inicializa tabelas
export async function initDb() {
  const db = await getDb();
  if (isPostgres) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS bets (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        br INTEGER NOT NULL,
        jp INTEGER NOT NULL,
        paid BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
  } else {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS bets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        br INTEGER NOT NULL,
        jp INTEGER NOT NULL,
        paid BOOLEAN NOT NULL DEFAULT 0
      )
    `);
    await db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
  }
  console.log(`Banco de dados inicializado com sucesso (${isPostgres ? 'PostgreSQL' : 'SQLite'}).`);
}

// Funções para gerenciar Apostas (Bets)
export async function getBets() {
  const db = await getDb();
  if (isPostgres) {
    const res = await db.query('SELECT * FROM bets ORDER BY name ASC');
    return res.rows.map(row => ({
      ...row,
      paid: !!row.paid
    }));
  } else {
    const rows = await db.all('SELECT * FROM bets ORDER BY name ASC');
    return rows.map(row => ({
      ...row,
      paid: !!row.paid
    }));
  }
}

export async function addBet({ id, name, br, jp, paid }) {
  const db = await getDb();
  const betId = id || String(Date.now());
  const isPaid = paid ? 1 : 0;
  if (isPostgres) {
    await db.query(
      'INSERT INTO bets (id, name, br, jp, paid) VALUES ($1, $2, $3, $4, $5)',
      [betId, name, br, jp, !!paid]
    );
  } else {
    await db.run(
      'INSERT INTO bets (id, name, br, jp, paid) VALUES (?, ?, ?, ?, ?)',
      [betId, name, br, jp, isPaid]
    );
  }
  return { id: betId, name, br, jp, paid: !!paid };
}

export async function updateBet(id, { name, br, jp, paid }) {
  const db = await getDb();
  const isPaid = paid ? 1 : 0;
  if (isPostgres) {
    await db.query(
      'UPDATE bets SET name = $1, br = $2, jp = $3, paid = $4 WHERE id = $5',
      [name, br, jp, !!paid, id]
    );
  } else {
    await db.run(
      'UPDATE bets SET name = ?, br = ?, jp = ?, paid = ? WHERE id = ?',
      [name, br, jp, isPaid, id]
    );
  }
  return { id, name, br, jp, paid: !!paid };
}

export async function deleteBet(id) {
  const db = await getDb();
  if (isPostgres) {
    await db.query('DELETE FROM bets WHERE id = $1', [id]);
  } else {
    await db.run('DELETE FROM bets WHERE id = ?', [id]);
  }
  return { id };
}

export async function clearAllBets() {
  const db = await getDb();
  if (isPostgres) {
    await db.query('DELETE FROM bets');
  } else {
    await db.run('DELETE FROM bets');
  }
}

// Funções para gerenciar Configurações (Settings)
export async function getSettings(key, defaultValue = null) {
  const db = await getDb();
  if (isPostgres) {
    const res = await db.query('SELECT value FROM settings WHERE key = $1', [key]);
    if (res.rows.length > 0) {
      return JSON.parse(res.rows[0].value);
    }
  } else {
    const row = await db.get('SELECT value FROM settings WHERE key = ?', [key]);
    if (row) {
      return JSON.parse(row.value);
    }
  }
  return defaultValue;
}

export async function setSettings(key, value) {
  const db = await getDb();
  const serializedValue = JSON.stringify(value);
  if (isPostgres) {
    await db.query(
      'INSERT INTO settings (key, value) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
      [key, serializedValue]
    );
  } else {
    await db.run(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, serializedValue]
    );
  }
  return value;
}
