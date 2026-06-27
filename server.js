import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { seedDb } from './seed.js';
import { getBets, addBet, updateBet, deleteBet, getSettings, setSettings } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'bolao-copa-secret-key-12345';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'bolao123';

// Middleware
app.use(cors());
app.use(express.json());

// Middleware de Autenticação Admin
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado.' });
    }
    req.user = user;
    next();
  });
}

// Rota de Login do Administrador
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token });
  }

  return res.status(401).json({ error: 'Senha incorreta!' });
});

// Rotas de Apostas (Bets)
app.get('/api/bets', async (req, res) => {
  try {
    const bets = await getBets();
    res.json(bets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar apostas.' });
  }
});

app.post('/api/bets', authenticateAdmin, async (req, res) => {
  try {
    const { name, br, jp, paid } = req.body;
    if (!name || br === undefined || jp === undefined) {
      return res.status(400).json({ error: 'Nome, gols do Brasil e gols do Japão são obrigatórios.' });
    }
    const newBet = await addBet({
      name: name.trim(),
      br: parseInt(br),
      jp: parseInt(jp),
      paid: !!paid
    });
    res.status(201).json(newBet);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cadastrar aposta.' });
  }
});

app.put('/api/bets/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, br, jp, paid } = req.body;
    if (!name || br === undefined || jp === undefined) {
      return res.status(400).json({ error: 'Nome, gols do Brasil e gols do Japão são obrigatórios.' });
    }
    const updated = await updateBet(id, {
      name: name.trim(),
      br: parseInt(br),
      jp: parseInt(jp),
      paid: !!paid
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar aposta.' });
  }
});

app.delete('/api/bets/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await deleteBet(id);
    res.json({ success: true, message: 'Aposta removida com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir aposta.' });
  }
});

// Rotas de Configurações (Settings)
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getSettings('game_state');
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao carregar configurações.' });
  }
});

app.put('/api/settings', authenticateAdmin, async (req, res) => {
  try {
    const { simBr, simJp, costPerBet, brTeam, jpTeam } = req.body;
    const current = await getSettings('game_state', {});
    const updated = {
      simBr: simBr !== undefined ? parseInt(simBr) : current.simBr,
      simJp: simJp !== undefined ? parseInt(simJp) : current.simJp,
      costPerBet: costPerBet !== undefined ? parseFloat(costPerBet) : current.costPerBet,
      brTeam: brTeam || current.brTeam,
      jpTeam: jpTeam || current.jpTeam
    };
    await setSettings('game_state', updated);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar configurações.' });
  }
});

// Forçar re-seeding do banco de dados (Apenas Admin)
app.post('/api/admin/reset-database', authenticateAdmin, async (req, res) => {
  try {
    await seedDb(true);
    const bets = await getBets();
    const settings = await getSettings('game_state');
    res.json({ success: true, bets, settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao resetar banco de dados.' });
  }
});

// Servir o Frontend React compilado
const frontendPath = path.resolve('./frontend/dist');
app.use(express.static(frontendPath));

// Fallback para rotas do React SPA
app.get('*', (req, res) => {
  const indexHtmlPath = path.join(frontendPath, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    res.sendFile(indexHtmlPath);
  } else {
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Servidor de API do Bolão</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 50px; background-color: #0f172a; color: #f1f5f9; }
          h1 { color: #facc15; }
          p { color: #94a3b8; }
        </style>
      </head>
      <body>
        <h1>Bolão Copa - API Online</h1>
        <p>O servidor está rodando perfeitamente.</p>
        <p><em>(Nota: O frontend React ainda não foi compilado. Execute <code>npm run build</code> na raiz para compilar o site e visualizá-lo aqui).</em></p>
      </body>
      </html>
    `);
  }
});

// Inicialização
async function startServer() {
  try {
    // Semeia banco de dados
    await seedDb();
    
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  } catch (err) {
    console.error('Falha ao iniciar o servidor:', err);
    process.exit(1);
  }
}

startServer();
