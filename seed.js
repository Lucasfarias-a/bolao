import { initDb, getBets, addBet, getSettings, setSettings, clearAllBets } from './db.js';

const initialBets = [
  { id: "1", name: "Sônia S.", br: 2, jp: 1, paid: false },
  { id: "2", name: "Milena", br: 2, jp: 1, paid: false },
  { id: "3", name: "Lucas Escanio", br: 3, jp: 1, paid: false },
  { id: "4", name: "Tharles", br: 2, jp: 0, paid: true },
  { id: "5", name: "Luana Cardoso", br: 3, jp: 1, paid: false },
  { id: "6", name: "Maurício Dal", br: 1, jp: 1, paid: false },
  { id: "7", name: "Marcos Jansen", br: 3, jp: 0, paid: false },
  { id: "8", name: "Ketlyn Opata", br: 2, jp: 0, paid: false },
  { id: "9", name: "Erick Leal", br: 2, jp: 0, paid: false },
  { id: "10", name: "Igor Eduardo", br: 3, jp: 1, paid: false },
  { id: "11", name: "Eugênio O.", br: 3, jp: 2, paid: false },
  { id: "12", name: "José Fila", br: 4, jp: 1, paid: false },
  { id: "13", name: "Nelson G. (Aposta 1)", br: 4, jp: 2, paid: true },
  { id: "14", name: "Nelson G. (Aposta 2)", br: 1, jp: 0, paid: true },
  { id: "15", name: "Jorge R.", br: 5, jp: 1, paid: false },
  { id: "16", name: "Stefhani R.", br: 2, jp: 0, paid: false },
  { id: "17", name: "Nikoly", br: 3, jp: 1, paid: true },
  { id: "18", name: "Maria Fernanda", br: 3, jp: 0, paid: false },
  { id: "19", name: "Jose Gomes", br: 1, jp: 2, paid: true },
  { id: "20", name: "Amanda V. (Aposta 1)", br: 2, jp: 1, paid: true },
  { id: "21", name: "Lucas F.", br: 3, jp: 1, paid: false },
  { id: "22", name: "Luiz A.", br: 3, jp: 0, paid: false },
  { id: "23", name: "Julia L.", br: 1, jp: 0, paid: false },
  { id: "24", name: "Adriano S.", br: 3, jp: 2, paid: true },
  { id: "25", name: "Aliny B. (Aposta 1)", br: 3, jp: 0, paid: true },
  { id: "26", name: "Aliny B. (Aposta 2)", br: 4, jp: 0, paid: true },
  { id: "27", name: "Wellington R. (Aposta 1)", br: 1, jp: 3, paid: true },
  { id: "28", name: "Wellington R. (Aposta 2)", br: 0, jp: 4, paid: true },
  { id: "29", name: "Amanda V. (Aposta 2)", br: 3, jp: 1, paid: false },
  { id: "30", name: "Humberto T.", br: 2, jp: 0, paid: false },
  { id: "31", name: "Carlos Chaves", br: 2, jp: 0, paid: true },
  { id: "32", name: "Rafaela Cristina", br: 3, jp: 2, paid: true },
  { id: "33", name: "Ramon Batista", br: 2, jp: 2, paid: true },
  { id: "34", name: "Priscila Souza", br: 2, jp: 1, paid: false },
  { id: "35", name: "Gregory F.", br: 2, jp: 1, paid: false }
];

const defaultSettings = {
  simBr: 2,
  simJp: 1,
  costPerBet: 3.00,
  brTeam: "Brasil",
  jpTeam: "Japão"
};

export async function seedDb(force = false) {
  // Inicializa a tabela caso ela não exista
  await initDb();

  // Verifica as apostas atuais
  const currentBets = await getBets();
  
  if (currentBets.length === 0 || force) {
    if (force) {
      await clearAllBets();
      console.log("Forçando re-seeding do banco de dados...");
    }
    
    console.log(`Populando banco com ${initialBets.length} palpites padrão...`);
    for (const bet of initialBets) {
      await addBet(bet);
    }
  }

  // Verifica/Salva as configurações padrões
  const currentSettings = await getSettings('game_state');
  if (!currentSettings || force) {
    await setSettings('game_state', defaultSettings);
  }

  console.log("Sementeira (seeding) concluída com sucesso!");
}
