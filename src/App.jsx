import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
  Home,
  Plus,
  Search,
  ShieldCheck,
  Thermometer,
  Trash2,
  UserRound,
  Wrench,
  Droplets,
  Truck,
  Sparkles
} from "lucide-react";
import "./index.css";

const STORAGE_KEY = "omnia_haccp_pro_v1";

const moduliBase = [
  { id: "temperature", nome: "Temperature", icona: Thermometer, descrizione: "Frigo, celle e freezer" },
  { id: "pulizie", nome: "Pulizie", icona: Sparkles, descrizione: "Sanificazione aree" },
  { id: "merci", nome: "Merci", icona: Truck, descrizione: "DDT, lotti e fornitori" },
  { id: "oli", nome: "Oli esausti", icona: Droplets, descrizione: "FIR e smaltimenti" },
  { id: "manutenzioni", nome: "Manutenzioni", icona: Wrench, descrizione: "Attrezzature e interventi" },
  { id: "formazione", nome: "Formazione", icona: GraduationCap, descrizione: "HACCP operatori" }
];

const statoScadenza = (dataScadenza) => {
  if (!dataScadenza) return "mancante";
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const scad = new Date(dataScadenza);
  scad.setHours(0, 0, 0, 0);
  const giorni = Math.ceil((scad - oggi) / (1000 * 60 * 60 * 24));

  if (giorni < 0) return "scaduto";
  if (giorni <= 30) return "scadenza";
  return "valido";
};

const statoLabel = {
  valido: "Valido",
  scadenza: "In scadenza",
  scaduto: "Scaduto",
  mancante: "Da completare"
};

const creaDatiIniziali = () => ({
  azienda: {
    nome: "Pizzaschetta e Maritata",
    piva: "",
    sede: "Gela",
    responsabile: "Orazio Romito"
  },
  staff: [
    { id: crypto.randomUUID(), nome: "Orazio Romito", ruolo: "Responsabile HACCP" }
  ],
  formazione: [],
  registrazioni: [],
  anomalie: []
});

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [moduloAttivo, setModuloAttivo] = useState("temperature");
  const [search, setSearch] = useState("");
  const [dati, setDati] = useState(() => {
    const salvati = localStorage.getItem(STORAGE_KEY);
    return salvati ? JSON.parse(salvati) : creaDatiIniziali();
  });

  const [formRegistro, setFormRegistro] = useState({
    modulo: "temperature",
    voce: "",
    dettaglio: "",
    esito: "CONFORME",
    azione: "",
    operatore: "Orazio Romito"
  });

  const [formFormazione, setFormFormazione] = useState({
    nome: "",
    corso: "HACCP ALIMENTARISTA",
    rilascio: "",
    scadenza: "",
    note: ""
  });

  const [nuovoStaff, setNuovoStaff] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dati));
  }, [dati]);

  const riepilogo = useMemo(() => {
    const anomalieAperte = dati.anomalie.filter(a => a.stato !== "CHIUSA").length;

    let scaduti = 0;
    let inScadenza = 0;

    dati.formazione.forEach(f => {
      const st = statoScadenza(f.scadenza);
      if (st === "scaduto") scaduti++;
      if (st === "scadenza") inScadenza++;
    });

    const statoGenerale = anomalieAperte > 0 || scaduti > 0
      ? "rosso"
      : inScadenza > 0
      ? "arancio"
      : "verde";

    return {
      statoGenerale,
      anomalieAperte,
      scaduti,
      inScadenza,
      registrazioniOggi: dati.registrazioni.filter(r => r.data === new Date().toISOString().slice(0, 10)).length
    };
  }, [dati]);

  const registraControllo = (e) => {
    e.preventDefault();

    if (!formRegistro.voce.trim()) {
      alert("Inserisci la voce del controllo.");
      return;
    }

    if (formRegistro.esito === "ANOMALIA" && formRegistro.azione.trim().length < 5) {
      alert("Per una anomalia devi scrivere l'azione correttiva.");
      return;
    }

    const nuova = {
      id: crypto.randomUUID(),
      data: new Date().toISOString().slice(0, 10),
      ora: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
      ...formRegistro
    };

    const anomalie = [...dati.anomalie];

    if (formRegistro.esito === "ANOMALIA") {
      anomalie.unshift({
        id: crypto.randomUUID(),
        data: nuova.data,
        modulo: formRegistro.modulo,
        titolo: formRegistro.voce,
        descrizione: formRegistro.dettaglio,
        azione: formRegistro.azione,
        stato: "APERTA",
        operatore: formRegistro.operatore
      });
    }

    setDati(prev => ({
      ...prev,
      registrazioni: [nuova, ...prev.registrazioni],
      anomalie
    }));

    setFormRegistro(prev => ({
      ...prev,
      voce: "",
      dettaglio: "",
      esito: "CONFORME",
      azione: ""
    }));

    alert("✅ Controllo registrato");
  };

  const salvaFormazione = (e) => {
    e.preventDefault();

    if (!formFormazione.nome || !formFormazione.scadenza) {
      alert("Inserisci nome e data scadenza.");
      return;
    }

    setDati(prev => ({
      ...prev,
      formazione: [
        {
          id: crypto.randomUUID(),
          ...formFormazione,
          dataInserimento: new Date().toISOString().slice(0, 10)
        },
        ...prev.formazione
      ]
    }));

    setFormFormazione({
      nome: "",
      corso: "HACCP ALIMENTARISTA",
      rilascio: "",
      scadenza: "",
      note: ""
    });
  };

  const aggiungiStaff = () => {
    if (!nuovoStaff.trim()) return;

    setDati(prev => ({
      ...prev,
      staff: [
        ...prev.staff,
        { id: crypto.randomUUID(), nome: nuovoStaff.trim(), ruolo: "Operatore" }
      ]
    }));

    setNuovoStaff("");
  };

  const chiudiAnomalia = (id) => {
    setDati(prev => ({
      ...prev,
      anomalie: prev.anomalie.map(a => a.id === id ? { ...a, stato: "CHIUSA" } : a)
    }));
  };

  const eliminaRegistro = (id) => {
    if (!confirm("Eliminare questa registrazione?")) return;
    setDati(prev => ({
      ...prev,
      registrazioni: prev.registrazioni.filter(r => r.id !== id)
    }));
  };

  const moduliFiltrati = moduliBase.filter(m =>
    m.nome.toLowerCase().includes(search.toLowerCase()) ||
    m.descrizione.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandIcon"><ShieldCheck size={28} /></div>
          <div>
            <h1>OMNIA</h1>
            <p>HACCP PRO</p>
          </div>
        </div>

        <nav>
          <button onClick={() => setTab("dashboard")} className={tab === "dashboard" ? "active" : ""}>
            <Home size={19} /> Dashboard
          </button>
          <button onClick={() => setTab("registri")} className={tab === "registri" ? "active" : ""}>
            <ClipboardList size={19} /> Registri
          </button>
          <button onClick={() => setTab("formazione")} className={tab === "formazione" ? "active" : ""}>
            <GraduationCap size={19} /> Formazione
          </button>
          <button onClick={() => setTab("anomalie")} className={tab === "anomalie" ? "active" : ""}>
            <AlertTriangle size={19} /> Anomalie
          </button>
          <button onClick={() => setTab("azienda")} className={tab === "azienda" ? "active" : ""}>
            <UserRound size={19} /> Azienda
          </button>
        </nav>

        <div className={"statusBox " + riepilogo.statoGenerale}>
          <span>Stato HACCP</span>
          <strong>
            {riepilogo.statoGenerale === "rosso" ? "Critico" : riepilogo.statoGenerale === "arancio" ? "Attenzione" : "Regolare"}
          </strong>
        </div>
      </aside>

      <main className="content">
        {tab === "dashboard" && (
          <>
            <Header titolo="Dashboard HACCP" sottotitolo="Controllo generale, scadenze e anomalie" />

            <section className="hero">
              <div>
                <p className="eyebrow">Stato generale</p>
                <h2>
                  {riepilogo.statoGenerale === "rosso" && "Ci sono elementi da sistemare"}
                  {riepilogo.statoGenerale === "arancio" && "Ci sono scadenze vicine"}
                  {riepilogo.statoGenerale === "verde" && "Tutto regolare"}
                </h2>
                <p>
                  Questo pannello guarda anomalie aperte e formazione HACCP. Le righe vecchie non bloccano se è presente una scadenza nuova valida.
                </p>
              </div>
              <div className={"bigLight " + riepilogo.statoGenerale}>
                {riepilogo.statoGenerale === "rosso" ? "ROSSO" : riepilogo.statoGenerale === "arancio" ? "ARANCIO" : "VERDE"}
              </div>
            </section>

            <section className="cards4">
              <StatCard label="Controlli oggi" value={riepilogo.registrazioniOggi} />
              <StatCard label="Anomalie aperte" value={riepilogo.anomalieAperte} danger={riepilogo.anomalieAperte > 0} />
              <StatCard label="HACCP scaduti" value={riepilogo.scaduti} danger={riepilogo.scaduti > 0} />
              <StatCard label="In scadenza" value={riepilogo.inScadenza} warning={riepilogo.inScadenza > 0} />
            </section>

            <section className="panel">
              <div className="panelHead">
                <h3>Moduli disponibili</h3>
                <div className="search">
                  <Search size={18} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca modulo..." />
                </div>
              </div>

              <div className="moduleGrid">
                {moduliFiltrati.map(m => {
                  const Icon = m.icona;
                  return (
                    <button key={m.id} className="moduleCard" onClick={() => { setTab("registri"); setModuloAttivo(m.id); setFormRegistro(p => ({ ...p, modulo: m.id })); }}>
                      <Icon size={30} />
                      <strong>{m.nome}</strong>
                      <span>{m.descrizione}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {tab === "registri" && (
          <>
            <Header titolo="Registri HACCP" sottotitolo="Registra controlli giornalieri e non conformità" />

            <section className="panel">
              <div className="tabs">
                {moduliBase.map(m => (
                  <button
                    key={m.id}
                    className={moduloAttivo === m.id ? "selected" : ""}
                    onClick={() => {
                      setModuloAttivo(m.id);
                      setFormRegistro(p => ({ ...p, modulo: m.id }));
                    }}
                  >
                    {m.nome}
                  </button>
                ))}
              </div>

              <form className="formGrid" onSubmit={registraControllo}>
                <label>
                  Voce controllo *
                  <input
                    value={formRegistro.voce}
                    onChange={e => setFormRegistro(p => ({ ...p, voce: e.target.value }))}
                    placeholder={placeholderVoce(moduloAttivo)}
                    list="staff-list"
                  />
                </label>

                <label>
                  Dettaglio
                  <input
                    value={formRegistro.dettaglio}
                    onChange={e => setFormRegistro(p => ({ ...p, dettaglio: e.target.value }))}
                    placeholder={placeholderDettaglio(moduloAttivo)}
                  />
                </label>

                <label>
                  Esito
                  <select value={formRegistro.esito} onChange={e => setFormRegistro(p => ({ ...p, esito: e.target.value }))}>
                    <option value="CONFORME">✅ Conforme</option>
                    <option value="ANOMALIA">❌ Anomalia</option>
                  </select>
                </label>

                <label>
                  Operatore
                  <select value={formRegistro.operatore} onChange={e => setFormRegistro(p => ({ ...p, operatore: e.target.value }))}>
                    {dati.staff.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                  </select>
                </label>

                {formRegistro.esito === "ANOMALIA" && (
                  <label className="full">
                    Azione correttiva obbligatoria *
                    <textarea
                      value={formRegistro.azione}
                      onChange={e => setFormRegistro(p => ({ ...p, azione: e.target.value }))}
                      placeholder="Descrivi cosa è stato fatto per risolvere il problema..."
                    />
                  </label>
                )}

                <button className="primary full" type="submit">
                  <Plus size={18} /> Registra controllo
                </button>
              </form>
            </section>

            <section className="panel">
              <h3>Ultime registrazioni</h3>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Modulo</th>
                      <th>Voce</th>
                      <th>Dettaglio</th>
                      <th>Esito</th>
                      <th>Operatore</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dati.registrazioni.slice(0, 30).map(r => (
                      <tr key={r.id}>
                        <td>{r.data} {r.ora}</td>
                        <td>{nomeModulo(r.modulo)}</td>
                        <td>{r.voce}</td>
                        <td>{r.dettaglio || "-"}</td>
                        <td><Badge tipo={r.esito === "ANOMALIA" ? "danger" : "ok"}>{r.esito}</Badge></td>
                        <td>{r.operatore}</td>
                        <td><button className="iconBtn" onClick={() => eliminaRegistro(r.id)}><Trash2 size={16} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {tab === "formazione" && (
          <>
            <Header titolo="Formazione HACCP" sottotitolo="Scadenze operatori, attestati e corsi" />

            <section className="panel">
              <form className="formGrid" onSubmit={salvaFormazione}>
                <label>
                  Operaio / dipendente *
                  <input
                    value={formFormazione.nome}
                    onChange={e => setFormFormazione(p => ({ ...p, nome: e.target.value }))}
                    list="staff-list"
                    placeholder="Seleziona o scrivi nome"
                  />
                </label>

                <label>
                  Corso
                  <select value={formFormazione.corso} onChange={e => setFormFormazione(p => ({ ...p, corso: e.target.value }))}>
                    <option>HACCP ALIMENTARISTA</option>
                    <option>AGGIORNAMENTO HACCP</option>
                    <option>SICUREZZA SUL LAVORO</option>
                    <option>ANTINCENDIO</option>
                    <option>PRIMO SOCCORSO</option>
                  </select>
                </label>

                <label>
                  Data rilascio
                  <input type="date" value={formFormazione.rilascio} onChange={e => setFormFormazione(p => ({ ...p, rilascio: e.target.value }))} />
                </label>

                <label>
                  Data scadenza *
                  <input type="date" value={formFormazione.scadenza} onChange={e => setFormFormazione(p => ({ ...p, scadenza: e.target.value }))} />
                </label>

                <label className="full">
                  Note
                  <input value={formFormazione.note} onChange={e => setFormFormazione(p => ({ ...p, note: e.target.value }))} placeholder="Es. attestato caricato, corso fatto online..." />
                </label>

                <button className="primary full" type="submit">
                  <Plus size={18} /> Salva formazione
                </button>
              </form>
            </section>

            <section className="panel">
              <h3>Elenco formazione</h3>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Corso</th>
                      <th>Rilascio</th>
                      <th>Scadenza</th>
                      <th>Stato</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dati.formazione.map(f => {
                      const st = statoScadenza(f.scadenza);
                      return (
                        <tr key={f.id}>
                          <td>{f.nome}</td>
                          <td>{f.corso}</td>
                          <td>{f.rilascio || "-"}</td>
                          <td>{f.scadenza}</td>
                          <td><Badge tipo={st === "scaduto" ? "danger" : st === "scadenza" ? "warning" : "ok"}>{statoLabel[st]}</Badge></td>
                          <td>{f.note || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {tab === "anomalie" && (
          <>
            <Header titolo="Anomalie e azioni correttive" sottotitolo="Gestisci non conformità aperte e chiuse" />

            <section className="panel">
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Modulo</th>
                      <th>Problema</th>
                      <th>Azione</th>
                      <th>Stato</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dati.anomalie.map(a => (
                      <tr key={a.id}>
                        <td>{a.data}</td>
                        <td>{nomeModulo(a.modulo)}</td>
                        <td>{a.titolo}</td>
                        <td>{a.azione}</td>
                        <td><Badge tipo={a.stato === "CHIUSA" ? "ok" : "danger"}>{a.stato}</Badge></td>
                        <td>
                          {a.stato !== "CHIUSA" && (
                            <button className="smallBtn" onClick={() => chiudiAnomalia(a.id)}>
                              Chiudi
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {tab === "azienda" && (
          <>
            <Header titolo="Azienda e operatori" sottotitolo="Dati attività, responsabile e personale" />

            <section className="panel">
              <div className="formGrid">
                <label>
                  Ragione sociale
                  <input value={dati.azienda.nome} onChange={e => setDati(p => ({ ...p, azienda: { ...p.azienda, nome: e.target.value } }))} />
                </label>
                <label>
                  P.IVA
                  <input value={dati.azienda.piva} onChange={e => setDati(p => ({ ...p, azienda: { ...p.azienda, piva: e.target.value } }))} />
                </label>
                <label>
                  Sede
                  <input value={dati.azienda.sede} onChange={e => setDati(p => ({ ...p, azienda: { ...p.azienda, sede: e.target.value } }))} />
                </label>
                <label>
                  Responsabile HACCP
                  <input value={dati.azienda.responsabile} onChange={e => setDati(p => ({ ...p, azienda: { ...p.azienda, responsabile: e.target.value } }))} />
                </label>
              </div>
            </section>

            <section className="panel">
              <h3>Staff</h3>
              <div className="inlineAdd">
                <input value={nuovoStaff} onChange={e => setNuovoStaff(e.target.value)} placeholder="Nome nuovo operatore" />
                <button className="primary" onClick={aggiungiStaff}>Aggiungi</button>
              </div>

              <div className="staffList">
                {dati.staff.map(s => (
                  <div key={s.id} className="staffItem">
                    <UserRound size={18} />
                    <strong>{s.nome}</strong>
                    <span>{s.ruolo}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel muted">
              <FileText size={22} />
              <div>
                <h3>Prossimo step</h3>
                <p>Dopo questa prova colleghiamo Firebase, GitHub e Vercel. Poi aggiungiamo PDF, foto DDT/FIR, allegati attestati e importazione dati dalla vecchia app.</p>
              </div>
            </section>
          </>
        )}

        <datalist id="staff-list">
          {dati.staff.map(s => <option key={s.id} value={s.nome} />)}
        </datalist>
      </main>
    </div>
  );
}

function Header({ titolo, sottotitolo }) {
  return (
    <header className="pageHeader">
      <div>
        <p className="eyebrow">OMNIA HACCP PRO</p>
        <h2>{titolo}</h2>
        <span>{sottotitolo}</span>
      </div>
      <div className="headerCheck">
        <CheckCircle2 size={20} />
        Sistema locale attivo
      </div>
    </header>
  );
}

function StatCard({ label, value, danger, warning }) {
  return (
    <div className={"stat " + (danger ? "danger" : warning ? "warning" : "")}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Badge({ tipo, children }) {
  return <span className={"badge " + tipo}>{children}</span>;
}

function nomeModulo(id) {
  return moduliBase.find(m => m.id === id)?.nome || id;
}

function placeholderVoce(modulo) {
  const map = {
    temperature: "Es. Cella 1, frigo banco, freezer...",
    pulizie: "Es. Cucina, banco, bagno, magazzino...",
    merci: "Es. Fornitore o prodotto ricevuto...",
    oli: "Es. Ditta ritiro olio esausto...",
    manutenzioni: "Es. Friggitrice, abbattitore, frigo...",
    formazione: "Es. Nome operatore..."
  };
  return map[modulo] || "Voce controllo";
}

function placeholderDettaglio(modulo) {
  const map = {
    temperature: "Es. +4 °C",
    pulizie: "Es. detergente usato / note",
    merci: "Es. lotto, DDT, scadenza",
    oli: "Es. litri e numero FIR",
    manutenzioni: "Es. intervento tecnico",
    formazione: "Es. corso e scadenza"
  };
  return map[modulo] || "Dettaglio";
}
