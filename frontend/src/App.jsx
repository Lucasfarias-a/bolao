import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Coins, 
  Trash2, 
  Edit3, 
  Share2, 
  RotateCcw, 
  UserPlus, 
  Search, 
  AlertTriangle, 
  Check, 
  Lock, 
  Unlock, 
  Settings, 
  LogOut, 
  X, 
  Plus, 
  Users,
  Save,
  Grid
} from 'lucide-react';

export default function App() {
  // Dados do Servidor
  const [bets, setBets] = useState([]);
  const [settings, setSettings] = useState({
    simBr: 2,
    simJp: 1,
    costPerBet: 3.00,
    brTeam: "Brasil",
    jpTeam: "Japão"
  });

  // Estados de Carregamento e Erro
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Resultados Simulados (Locais do Dashboard)
  const [simBr, setSimBr] = useState(2);
  const [simJp, setSimJp] = useState(1);
  
  // Filtros e Pesquisa
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPaid, setFilterPaid] = useState('all');
  const [filterWinnersOnly, setFilterWinnersOnly] = useState(false);

  // Autenticação Admin
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('admin_token'));
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState(null);

  // Modais de Criação / Edição de Aposta
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingBet, setEditingBet] = useState(null); // null = criar, objeto = editar
  const [betName, setBetName] = useState('');
  const [betBr, setBetBr] = useState(2);
  const [betJp, setBetJp] = useState(1);
  const [betPaid, setBetPaid] = useState(false);

  // Modal de Configurações do Jogo
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [gameBrTeam, setGameBrTeam] = useState('');
  const [gameJpTeam, setGameJpTeam] = useState('');
  const [gameCost, setGameCost] = useState(3.00);

  // Confirmações
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, name: '' });
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Toast de Notificação
  const [notification, setNotification] = useState('');

  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  // Cabeçalho de autorização para requisições de escrita
  const authHeaders = useMemo(() => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    };
  }, [adminToken]);

  // Carregar dados iniciais do backend
  const fetchData = async () => {
    setLoading(true);
    try {
      const [betsRes, settingsRes] = await Promise.all([
        fetch('/api/bets'),
        fetch('/api/settings')
      ]);

      if (!betsRes.ok || !settingsRes.ok) {
        throw new Error('Falha ao obter dados do servidor.');
      }

      const betsData = await betsRes.json();
      const settingsData = await settingsRes.json();

      setBets(betsData);
      setSettings(settingsData);
      
      // Sincronizar o simulador local com o placar oficial cadastrado no banco
      setSimBr(settingsData.simBr);
      setSimJp(settingsData.simJp);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Erro de conexão com o servidor de banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Login do Administrador
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Senha incorreta.');
      }

      localStorage.setItem('admin_token', data.token);
      setAdminToken(data.token);
      setAdminPassword('');
      setShowLoginModal(false);
      triggerNotification('Login de Administrador realizado! 🔓');
    } catch (err) {
      setLoginError(err.message);
    }
  };

  // Logout do Administrador
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setAdminToken(null);
    triggerNotification('Sessão encerrada. Modo visualização ativo. 🔒');
  };

  // Estatísticas e Divisão Dinâmica
  const stats = useMemo(() => {
    const total = bets.length;
    const paidCount = bets.filter(b => b.paid).length;
    const prizePool = paidCount * settings.costPerBet;
    const potentialPrizePool = total * settings.costPerBet;

    // Vencedores são aqueles que acertaram exatamente o placar simulado
    const winners = bets.filter(b => Number(b.br) === simBr && Number(b.jp) === simJp);
    const winnersCount = winners.length;
    const prizePerWinner = winnersCount > 0 ? (prizePool / winnersCount) : 0;

    return {
      total,
      paidCount,
      prizePool,
      potentialPrizePool,
      winners,
      winnersCount,
      prizePerWinner
    };
  }, [bets, simBr, simJp, settings.costPerBet]);

  // Organizar apostas (Vencedores no topo)
  const processedBets = useMemo(() => {
    return [...bets]
      .map(bet => {
        const isWinner = Number(bet.br) === simBr && Number(bet.jp) === simJp;
        return { ...bet, isWinner };
      })
      .sort((a, b) => {
        if (a.isWinner && !b.isWinner) return -1;
        if (!a.isWinner && b.isWinner) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [bets, simBr, simJp]);

  // Filtragem ativa de pesquisa, status de pagamento e acerto
  const filteredBets = useMemo(() => {
    return processedBets.filter(bet => {
      const matchesSearch = bet.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            `${bet.br}x${bet.jp}`.includes(searchTerm.replace(/\s+/g, ''));
      const matchesFilter = filterPaid === 'all' ? true :
                            filterPaid === 'paid' ? bet.paid : !bet.paid;
      const matchesWinner = filterWinnersOnly ? bet.isWinner : true;
      return matchesSearch && matchesFilter && matchesWinner;
    });
  }, [processedBets, searchTerm, filterPaid, filterWinnersOnly]);

  // Salvar Placar Oficial no Servidor (Apenas Admin)
  const saveOfficialScore = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ simBr, simJp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setSettings(data);
      triggerNotification('Placar oficial atualizado com sucesso! ⚽');
    } catch (err) {
      triggerNotification(`Falha ao salvar placar: ${err.message}`);
    }
  };

  // Criar / Editar Aposta (Apenas Admin)
  const openAddBetModal = () => {
    setEditingBet(null);
    setBetName('');
    setBetBr(2);
    setBetJp(1);
    setBetPaid(false);
    setShowAddEditModal(true);
  };

  const openEditBetModal = (bet) => {
    setEditingBet(bet);
    setBetName(bet.name);
    setBetBr(bet.br);
    setBetJp(bet.jp);
    setBetPaid(bet.paid);
    setShowAddEditModal(true);
  };

  const handleAddEditSubmit = async (e) => {
    e.preventDefault();
    if (!betName.trim()) return;

    const payload = {
      name: betName.trim(),
      br: Number(betBr),
      jp: Number(betJp),
      paid: betPaid
    };

    try {
      let res;
      if (editingBet) {
        res = await fetch(`/api/bets/${editingBet.id}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/bets', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (editingBet) {
        setBets(prev => prev.map(b => b.id === editingBet.id ? data : b));
        triggerNotification(`Palpite de ${data.name} editado com sucesso!`);
      } else {
        setBets(prev => [...prev, data]);
        triggerNotification(`Palpite de ${data.name} adicionado com sucesso!`);
      }
      setShowAddEditModal(false);
    } catch (err) {
      triggerNotification(`Erro: ${err.message}`);
    }
  };

  // Alternar pagamento com clique rápido (Apenas Admin)
  const togglePayment = async (bet) => {
    if (!adminToken) return;
    const updatedBet = { ...bet, paid: !bet.paid };
    try {
      const res = await fetch(`/api/bets/${bet.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(updatedBet)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setBets(prev => prev.map(b => b.id === bet.id ? data : b));
      triggerNotification(`${bet.name}: ${data.paid ? 'Marcado como Pago ✅' : 'Marcado como Pendente ⚠️'}`);
    } catch (err) {
      triggerNotification(`Erro ao alterar pagamento: ${err.message}`);
    }
  };

  // Excluir Aposta (Apenas Admin)
  const handleDeleteConfirm = (bet) => {
    setDeleteConfirm({ show: true, id: bet.id, name: bet.name });
  };

  const executeDelete = async () => {
    try {
      const res = await fetch(`/api/bets/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setBets(prev => prev.filter(b => b.id !== deleteConfirm.id));
      triggerNotification(`Palpite de ${deleteConfirm.name} removido! 🗑️`);
    } catch (err) {
      triggerNotification(`Erro ao excluir: ${err.message}`);
    } finally {
      setDeleteConfirm({ show: false, id: null, name: '' });
    }
  };

  // Abrir configurações do jogo (Apenas Admin)
  const openSettingsModal = () => {
    setGameBrTeam(settings.brTeam);
    setGameJpTeam(settings.jpTeam);
    setGameCost(settings.costPerBet);
    setShowSettingsModal(true);
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          brTeam: gameBrTeam.trim(),
          jpTeam: gameJpTeam.trim(),
          costPerBet: Number(gameCost)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSettings(data);
      setShowSettingsModal(false);
      triggerNotification('Configurações do jogo salvas! ⚙️');
    } catch (err) {
      triggerNotification(`Erro: ${err.message}`);
    }
  };

  // Resetar base para o padrão do caderno (Apenas Admin)
  const executeResetDb = async () => {
    try {
      const res = await fetch('/api/admin/reset-database', {
        method: 'POST',
        headers: authHeaders
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setBets(data.bets);
      setSettings(data.settings);
      setSimBr(data.settings.simBr);
      setSimJp(data.settings.simJp);
      triggerNotification('Banco de dados restaurado aos valores do caderno! ⚠️');
    } catch (err) {
      triggerNotification(`Erro ao resetar: ${err.message}`);
    } finally {
      setShowResetConfirm(false);
    }
  };

  // Copiar Resumo para o WhatsApp
  const copyReportToClipboard = () => {
    let text = `🏆 *BOLÃO ${settings.brTeam.toUpperCase()} x ${settings.jpTeam.toUpperCase()}* 🏆\n`;
    text += `Placar Simulado: *${simBr} x ${simJp}*\n`;
    text += `💰 Pote do Prêmio: *R$ ${stats.prizePool.toFixed(2)}*\n`;
    text += `------------------------------------\n\n`;

    if (stats.winnersCount > 0) {
      text += `🔥 *ACERTADORES DO PLACAR EXATO (${stats.winnersCount}):*\n`;
      stats.winners.forEach(w => {
        text += `- *${w.name}* ${w.paid ? '✅ (Pago)' : '⚠️ (Pendente)'}\n`;
      });
      text += `\n💵 *Prêmio por pessoa:* R$ ${stats.prizePerWinner.toFixed(2)} acumulado!`;
    } else {
      text += `⚠️ *Ninguém acertou este placar ainda!* O prêmio de R$ ${stats.prizePool.toFixed(2)} continua acumulado para o grupo.`;
    }

    navigator.clipboard.writeText(text)
      .then(() => triggerNotification("Resultados copiados! Cole diretamente no grupo do WhatsApp."))
      .catch(() => triggerNotification("Falha ao copiar automaticamente. Tente novamente."));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-100">
        <div className="relative w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">Carregando palpites do bolão...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-100 p-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-2 animate-bounce" />
        <h2 className="text-lg font-bold text-white mb-1">Falha na Conexão</h2>
        <p className="text-xs text-slate-400 text-center max-w-sm mb-4">{error}</p>
        <button 
          onClick={fetchData} 
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 transition text-white font-bold text-xs rounded-xl shadow-lg"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16 font-sans relative selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Notificação Toast */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900/95 border-2 border-emerald-500/60 backdrop-blur-md text-slate-100 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 font-semibold text-xs animate-fade-in shadow-emerald-950/20">
          <Trophy className="text-yellow-400 w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Cabeçalho */}
      <header className="relative bg-gradient-to-b from-emerald-950/40 via-slate-950 to-slate-950 pt-8 pb-8 px-4 border-b border-slate-900">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-3">
              ⚽ Regra: Acerto de Placar Exato (Inscrição: R$ {settings.costPerBet.toFixed(2)})
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white uppercase">
              Bolão <span className="text-emerald-400">{settings.brTeam}</span> <span className="text-slate-400">x</span> <span className="text-yellow-400">{settings.jpTeam}</span>
            </h1>
            <p className="mt-1 text-slate-400 text-xs max-w-md">
              Acompanhamento oficial da equipe. O prêmio acumulado será dividido igualmente entre quem cravar o placar.
            </p>
          </div>

          <div className="flex gap-2">
            {adminToken ? (
              <>
                <button 
                  onClick={openSettingsModal}
                  className="flex items-center justify-center p-2.5 bg-slate-905 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl transition"
                  title="Configurar Partida"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-red-950/40 border border-red-900/60 text-red-400 hover:bg-red-950 rounded-xl font-bold text-xs transition"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sair
                </button>
              </>
            ) : (
              <button 
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded-xl font-bold text-xs transition"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" /> Admin
              </button>
            )}
          </div>

        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6">
        
        {/* Painel do Simulador */}
        <section className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4 pb-4 border-b border-slate-800/60">
            <div>
              <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest block mb-0.5">Mude o placar para simular</span>
              <h2 className="text-md font-extrabold text-white flex items-center gap-1.5">
                <Grid className="w-4 h-4 text-emerald-400" /> Painel de Simulação
              </h2>
            </div>
            {adminToken && (
              <button
                onClick={saveOfficialScore}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition shadow-lg shadow-emerald-950/40"
              >
                <Save className="w-3.5 h-3.5" /> Definir Placar Oficial
              </button>
            )}
          </div>

          <div className="flex items-center justify-center gap-6 md:gap-12 my-2">
            {/* Time 1 */}
            <div className="flex items-center gap-4">
              <span className="text-md md:text-xl font-extrabold text-white tracking-wide">{settings.brTeam}</span>
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1.5 rounded-xl">
                <button 
                  onClick={() => setSimBr(Math.max(0, simBr - 1))}
                  className="w-7 h-7 flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition active:scale-95 border border-slate-800"
                >
                  -
                </button>
                <span className="w-8 text-center text-xl font-black text-emerald-400">{simBr}</span>
                <button 
                  onClick={() => setSimBr(simBr + 1)}
                  className="w-7 h-7 flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition active:scale-95 border border-slate-800"
                >
                  +
                </button>
              </div>
            </div>

            <span className="text-slate-650 font-bold text-lg">X</span>

            {/* Time 2 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1.5 rounded-xl">
                <button 
                  onClick={() => setSimJp(Math.max(0, simJp - 1))}
                  className="w-7 h-7 flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition active:scale-95 border border-slate-800"
                >
                  -
                </button>
                <span className="w-8 text-center text-xl font-black text-yellow-400">{simJp}</span>
                <button 
                  onClick={() => setSimJp(simJp + 1)}
                  className="w-7 h-7 flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition active:scale-95 border border-slate-800"
                >
                  +
                </button>
              </div>
              <span className="text-md md:text-xl font-extrabold text-white tracking-wide">{settings.jpTeam}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/40 flex justify-between items-center text-[10px] text-slate-500">
            <span>A lista de palpites é reordenada e filtrada dinamicamente.</span>
            <button 
              onClick={() => { setSimBr(settings.simBr); setSimJp(settings.simJp); }}
              className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <RotateCcw className="w-3 h-3" /> Restaurar Placar Oficial ({settings.simBr}x{settings.simJp})
            </button>
          </div>
        </section>

        {/* Dashboard de Estatísticas */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          
          {/* Card 1: Pote Acumulado */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
            <div>
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Pote Acumulado</span>
              <div className="text-2xl font-black text-emerald-400 flex items-center gap-2">
                <Coins className="w-5 h-5" />
                R$ {stats.prizePool.toFixed(2)}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              Contando {stats.paidCount} palpites pagos de R$ {settings.costPerBet.toFixed(2)}. ({stats.total} total)
            </p>
          </div>

          {/* Card 2: Acertadores do Placar */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
            <div>
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-1">Acertadores ({simBr}x{simJp})</span>
              <div className="text-2xl font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-400" />
                {stats.winnersCount} {stats.winnersCount === 1 ? 'pessoa' : 'pessoas'}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              Que palpitaram exatamente {simBr} x {simJp}.
            </p>
          </div>

          {/* Card 3: Prêmio Individual */}
          <div className="bg-gradient-to-br from-emerald-950/20 to-slate-900 border border-emerald-900/30 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">Prêmio Individual</span>
              <div className="text-2xl font-black text-yellow-300">
                {stats.winnersCount > 0 ? `R$ ${stats.prizePerWinner.toFixed(2)}` : 'R$ 0,00'}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              {stats.winnersCount > 0 
                ? `Pote dividido entre os ${stats.winnersCount} acertadores.`
                : "Nenhum acerto para este placar. Acumulado!"}
            </p>
          </div>

        </section>

        {/* Tabela de Apostas */}
        <section className="bg-slate-900 rounded-2xl border border-slate-850 shadow-xl overflow-hidden">
          
          {/* Topo / Filtros */}
          <div className="p-4 bg-slate-900/40 border-b border-slate-800/80 flex flex-col md:flex-row gap-3 items-center justify-between">
            
            {/* Campo de Busca */}
            <div className="relative w-full md:w-60">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input 
                type="text" 
                placeholder="Buscar participante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            {/* Ações e Filtros */}
            <div className="flex flex-wrap items-center justify-end gap-2 w-full md:w-auto">
              
              {/* Filtro Pagamento */}
              <select
                value={filterPaid}
                onChange={(e) => setFilterPaid(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">Todos os palpites</option>
                <option value="paid">Apenas Pagos</option>
                <option value="pending">Apenas Pendentes</option>
              </select>

              {/* Checkbox para Filtrar Vencedores */}
              <button
                onClick={() => setFilterWinnersOnly(!filterWinnersOnly)}
                className={`px-3 py-2 border rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                  filterWinnersOnly 
                    ? 'bg-emerald-950/60 border-emerald-700 text-emerald-400' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" /> Ganhadores
              </button>

              {adminToken && (
                <button 
                  onClick={openAddBetModal}
                  className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition active:scale-95 shadow-md shadow-emerald-950/20"
                >
                  <Plus className="w-3.5 h-3.5" /> Palpite
                </button>
              )}

              <button 
                onClick={copyReportToClipboard}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl font-bold text-xs transition"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-400" /> WhatsApp
              </button>

            </div>
          </div>

          {/* Listagem de Palpites */}
          <div className="divide-y divide-slate-850/80 max-h-[500px] overflow-y-auto">
            {filteredBets.map((bet) => (
              <div 
                key={bet.id} 
                className={`p-3.5 flex items-center justify-between gap-4 transition ${
                  bet.isWinner 
                    ? 'bg-emerald-950/30 border-l-4 border-emerald-400' 
                    : 'hover:bg-slate-800/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  {bet.isWinner ? (
                    <div className="w-7 h-7 rounded-full bg-emerald-950 border border-emerald-500 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-900/30">
                      <Trophy className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-bold" />
                  )}

                  <div>
                    <span className={`block text-xs md:text-sm font-semibold ${bet.isWinner ? 'text-emerald-300 font-black' : 'text-slate-100'}`}>
                      {bet.name}
                    </span>
                    <button 
                      onClick={() => togglePayment(bet)}
                      disabled={!adminToken}
                      className={`mt-1 inline-flex rounded-lg transition ${adminToken ? 'cursor-pointer' : 'cursor-default'}`}
                      title={adminToken ? "Clique para alternar pagamento" : undefined}
                    >
                      {bet.paid ? (
                        <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-extrabold uppercase flex items-center gap-1 hover:bg-emerald-500/25">
                          <Check className="w-2.5 h-2.5" /> Pago (R$ {settings.costPerBet.toFixed(0)})
                        </span>
                      ) : (
                        <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-extrabold uppercase flex items-center gap-1 hover:bg-amber-500/25">
                          <AlertTriangle className="w-2.5 h-2.5" /> Pendente
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3.5">
                  {/* Placar */}
                  <div className={`px-3 py-1 rounded-xl text-sm font-mono tracking-wider font-extrabold ${
                    bet.isWinner 
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-400/20 border border-emerald-400' 
                      : 'bg-slate-950 border border-slate-800 text-slate-300'
                  }`}>
                    {bet.br} x {bet.jp}
                  </div>

                  {/* Ações Administrativas */}
                  {adminToken && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => openEditBetModal(bet)}
                        className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        title="Editar Palpite"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteConfirm(bet)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800/40 rounded-lg transition cursor-pointer"
                        title="Excluir Palpite"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredBets.length === 0 && (
              <div className="p-10 text-center text-slate-500 text-xs">
                Nenhum palpite corresponde aos filtros selecionados.
              </div>
            )}
          </div>

        </section>

        {/* Rodapé Administrativo / Reset */}
        {adminToken && (
          <div className="mt-6 text-center border-t border-slate-900 pt-6">
            <button 
              onClick={() => setShowResetConfirm(true)}
              className="text-[10px] text-red-500/70 hover:text-red-400 transition font-bold uppercase tracking-wider flex items-center gap-1.5 mx-auto"
            >
              <RotateCcw className="w-3 h-3" /> Restaurar lista inicial das fotos (Apaga modificações)
            </button>
          </div>
        )}

      </main>

      {/* MODAL: Login de Administrador */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 max-w-sm w-full p-6 space-y-4 shadow-2xl relative">
            <button 
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-center">
              <div className="w-10 h-10 bg-slate-950 border border-slate-800 rounded-full flex items-center justify-center mx-auto mb-2 text-emerald-400">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Acesso Administrativo</h3>
              <p className="text-[10px] text-slate-500">Insira a senha cadastrada para gerenciar os palpites.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div>
                <input 
                  type="password" 
                  required 
                  placeholder="Senha do Administrador" 
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center"
                />
              </div>

              {loginError && (
                <div className="p-2 bg-red-950/40 border border-red-900/40 text-red-400 text-center rounded-lg font-bold">
                  {loginError}
                </div>
              )}

              <button 
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Autenticar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Adicionar ou Editar Palpite */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 max-w-sm w-full p-6 space-y-4 shadow-2xl relative">
            <button 
              onClick={() => setShowAddEditModal(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="pb-2 border-b border-slate-800">
              <h3 className="text-sm font-extrabold text-white">
                {editingBet ? 'Editar Palpite Existente' : 'Cadastrar Novo Palpite'}
              </h3>
            </div>

            <form onSubmit={handleAddEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1.5">Nome do Participante</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ex: Lucas Farias" 
                  value={betName}
                  onChange={(e) => setBetName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1.5">Gols {settings.brTeam}</label>
                  <input 
                    type="number" 
                    min="0" 
                    required 
                    value={betBr}
                    onChange={(e) => setBetBr(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-center text-emerald-450 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1.5">Gols {settings.jpTeam}</label>
                  <input 
                    type="number" 
                    min="0" 
                    required 
                    value={betJp}
                    onChange={(e) => setBetJp(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-center text-yellow-450 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-1 select-none">
                <input 
                  type="checkbox" 
                  id="bet-paid" 
                  checked={betPaid}
                  onChange={(e) => setBetPaid(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 bg-slate-950 border-slate-800 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="bet-paid" className="text-slate-300 font-semibold cursor-pointer">
                  Inscrição de R$ {settings.costPerBet.toFixed(2)} já paga?
                </label>
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                {editingBet ? 'Salvar Alterações' : 'Cadastrar Palpite'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Configurações do Jogo */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 max-w-sm w-full p-6 space-y-4 shadow-2xl relative">
            <button 
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="pb-2 border-b border-slate-800">
              <h3 className="text-sm font-extrabold text-white">Configurações da Partida</h3>
            </div>

            <form onSubmit={handleSettingsSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1.5">Nome Time 1</label>
                  <input 
                    type="text" 
                    required 
                    value={gameBrTeam}
                    onChange={(e) => setGameBrTeam(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold uppercase mb-1.5">Nome Time 2</label>
                  <input 
                    type="text" 
                    required 
                    value={gameJpTeam}
                    onChange={(e) => setGameJpTeam(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase mb-1.5">Preço da Inscrição (R$)</label>
                <input 
                  type="number" 
                  step="0.50" 
                  min="0" 
                  required 
                  value={gameCost}
                  onChange={(e) => setGameCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Salvar Configurações
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO: Excluir Aposta */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-red-950/40 border border-red-900 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-red-950/40">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-extrabold text-white">Excluir Palpite?</h3>
            <p className="text-xs text-slate-400">
              Deseja realmente apagar o palpite de <strong className="text-white">{deleteConfirm.name}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setDeleteConfirm({ show: false, id: null, name: '' })}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-755 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={executeDelete}
                className="flex-1 py-2 bg-red-650 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAÇÃO: Resetar Banco */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-red-950/40 border border-red-900 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-red-950/40">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-extrabold text-white">Restaurar Caderno Original?</h3>
            <p className="text-xs text-slate-400">
              Isso irá apagar todos os palpites criados ou modificados manualmente e restaurar os 35 nomes e pagamentos iniciais. Tem certeza?
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-755 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={executeResetDb}
                className="flex-1 py-2 bg-red-650 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Sim, Restaurar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rodapé */}
      <footer className="text-center text-[10px] text-slate-600 mt-12 px-4">
        <span>Desenvolvido para gerenciamento fácil e interativo de Bolões de Futebol.</span>
      </footer>

    </div>
  );
}
