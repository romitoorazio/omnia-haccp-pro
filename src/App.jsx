import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Bell,
  CheckCircle2,
  ClipboardList,
  Database,
  Download,
  Factory,
  FileDown,
  FileText,
  GraduationCap,
  Home,
  PackageCheck,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Thermometer,
  Trash2,
  Truck,
  Upload,
  UserRound,
  Wrench,
  Droplets,
  Bug,
  Gauge,
  Flame,
  Snowflake,
  Apple,
  Boxes
} from "lucide-react";
import "./index.css";

const STORAGE_KEY = "omnia_haccp_pro_v2";

const moduliBase = [
  { id: "temperature", nome: "Temperature", icona: Thermometer, descrizione: "Frigo, celle, freezer, banco frigo" },
  { id: "pulizie", nome: "Pulizie", icona: Sparkles, descrizione: "Sanificazioni giornaliere e straordinarie" },
  { id: "merci", nome: "Merci in entrata", icona: Truck, descrizione: "DDT, fornitori, lotti e scadenze" },
  { id: "oli", nome: "Oli esausti", icona: Droplets, descrizione: "FIR, litri smaltiti e ditta incaricata" },
  { id: "manutenzioni", nome: "Manutenzioni", icona: Wrench, descrizione: "Interventi tecnici e attrezzature" },
  { id: "formazione", nome: "Formazione", icona: GraduationCap, descrizione: "Attestati HACCP e corsi" },
  { id: "infestanti", nome: "Infestanti", icona: Bug, descrizione: "Disinfestazione e monitoraggio" },
  { id: "tarature", nome: "Tarature", icona: Gauge, descrizione: "Termometri e strumenti di misura" },
  { id: "cotture", nome: "Cotture", icona: Flame, descrizione: "Temperature di cottura e mantenimento" },
  { id: "abbattimento", nome: "Abbattimento", icona: Snowflake, descrizione: "Raffreddamento rapido e conservazione" },
  { id: "allergeni", nome: "Allergeni", icona: Apple, descrizione: "Controlli allergeni e contaminazioni" },
  { id: "rifiuti", nome: "Rifiuti", icona: Archive, descrizione: "Registro rifiuti e documenti collegati" }
];

const allergeniUE = [
  "Glutine",
  "Crostacei",
  "Uova",
  "Pesce",
  "Arachidi",
  "Soia",
  "Latte",
  "Frutta a guscio",
  "Sedano",
  "Senape",
  "Sesamo",
  "Solfiti",
  "Lupini",
  "Molluschi"
];

const today = () => new Date().toISOString().slice(0, 10);

const uid = () => {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "id_" + Date.now() + "_" + Math.random().toString(16).slice(2);
};

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

const datiIniziali = () => ({
  azienda: {
    nome: "Pizzaschetta e Maritata",
    piva: "",
    sede: "Gela",
    responsabile: "Orazio Romito"
  },
  staff: [
    { id: uid(), nome: "Orazio Romito", ruolo: "Responsabile HACCP" }
  ],
  fornitori: [
    { id: uid(), nome: "Fornitore esempio", categoria: "Alimenti", telefono: "", email: "", note: "" }
  ],
  prodotti: [
    { id: uid(), nome: "Panino salsiccia", categoria: "Panineria", lotto: "", scadenza: "", allergeni: ["Glutine"], note: "" }
  ],
  attrezzature: [
    { id: uid(), nome: "Cella 1", tipo: "Frigo", posizione: "Cucina", temperaturaMin: "0", temperaturaMax: "4", prossimaManutenzione: "" },
    { id: uid(), nome: "Freezer", tipo: "Freezer", posizione: "Cucina", temperaturaMin: "-22", temperaturaMax: "-18", prossimaManutenzione: "" }
  ],
  formazione: [],
  registrazioni: [],
  anomalie: [],
  scadenze: []
});

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [moduloAttivo, setModuloAttivo] = useState("temperature");
  const [search, setSearch] = useState("");
  const [sottoTab, setSottoTab] = useState("fornitori");

  const [dati, setDati] = useState(() => {
    const salvati = localStorage.getItem(STORAGE_KEY);
    return salvati ? JSON.parse(salvati) : datiIniziali();
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

  const [formFornitore, setFormFornitore] = useState({
    nome: "",
    categoria: "Alimenti",
    telefono: "",
    email: "",
    note: ""
  });

  const [formProdotto, setFormProdotto] = useState({
    nome: "",
    categoria: "",
    lotto: "",
    scadenza: "",
    allergeni: [],
    note: ""
  });

  const [formAttrezzatura, setFormAttrezzatura] = useState({
    nome: "",
    tipo: "Frigo",
    posizione: "",
    temperaturaMin: "",
    temperaturaMax: "",
    prossimaManutenzione: ""
  });

  const [formScadenza, setFormScadenza] = useState({
    titolo: "",
    tipo: "Documento",
    data: "",
    responsabile: "Orazio Romito",
    note: ""
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dati));
  }, [dati]);

  const ultimeFormazioniValide = useMemo(() => {
    const map = {};
    dati.formazione.forEach(f => {
      const key = (f.nome + "|" + f.corso).toUpperCase();
      if (!map[key] || new Date(f.scadenza) > new Date(map[key].scadenza)) {
        map[key] = f;
      }
    });
    return Object.values(map);
  }, [dati.formazione]);

  const riepilogo = useMemo(() => {
    const anomalieAperte = dati.anomalie.filter(a => a.stato !== "CHIUSA").length;

    let scaduti = 0;
    let inScadenza = 0;

    ultimeFormazioniValide.forEach(f => {
      const st = statoScadenza(f.scadenza);
      if (st === "scaduto") scaduti++;
      if (st === "scadenza") inScadenza++;
    });

    dati.scadenze.forEach(s => {
      const st = statoScadenza(s.data);
      if (st === "scaduto") scaduti++;
      if (st === "scadenza") inScadenza++;
    });

    dati.prodotti.forEach(p => {
      if (!p.scadenza) return;
      const st = statoScadenza(p.scadenza);
      if (st === "scaduto") scaduti++;
      if (st === "scadenza") inScadenza++;
    });

    dati.attrezzature.forEach(a => {
      if (!a.prossimaManutenzione) return;
      const st = statoScadenza(a.prossimaManutenzione);
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
      registrazioniOggi: dati.registrazioni.filter(r => r.data === today()).length,
      fornitori: dati.fornitori.length,
      prodotti: dati.prodotti.length,
      attrezzature: dati.attrezzature.length
    };
  }, [dati, ultimeFormazioniValide]);

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
      id: uid(),
      data: today(),
      ora: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
      ...formRegistro
    };

    setDati(prev => {
      const anomalie = [...prev.anomalie];

      if (formRegistro.esito === "ANOMALIA") {
        anomalie.unshift({
          id: uid(),
          data: nuova.data,
          modulo: formRegistro.modulo,
          titolo: formRegistro.voce,
          descrizione: formRegistro.dettaglio,
          azione: formRegistro.azione,
          stato: "APERTA",
          operatore: formRegistro.operatore
        });
      }

      return {
        ...prev,
        registrazioni: [nuova, ...prev.registrazioni],
        anomalie
      };
    });

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
          id: uid(),
          ...formFormazione,
          dataInserimento: today()
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

  const salvaFornitore = (e) => {
    e.preventDefault();
    if (!formFornitore.nome.trim()) return alert("Inserisci nome fornitore.");
    setDati(prev => ({
      ...prev,
      fornitori: [{ id: uid(), ...formFornitore }, ...prev.fornitori]
    }));
    setFormFornitore({ nome: "", categoria: "Alimenti", telefono: "", email: "", note: "" });
  };

  const salvaProdotto = (e) => {
    e.preventDefault();
    if (!formProdotto.nome.trim()) return alert("Inserisci nome prodotto.");
    setDati(prev => ({
      ...prev,
      prodotti: [{ id: uid(), ...formProdotto }, ...prev.prodotti]
    }));
    setFormProdotto({ nome: "", categoria: "", lotto: "", scadenza: "", allergeni: [], note: "" });
  };

  const salvaAttrezzatura = (e) => {
    e.preventDefault();
    if (!formAttrezzatura.nome.trim()) return alert("Inserisci nome attrezzatura.");
    setDati(prev => ({
      ...prev,
      attrezzature: [{ id: uid(), ...formAttrezzatura }, ...prev.attrezzature]
    }));
    setFormAttrezzatura({ nome: "", tipo: "Frigo", posizione: "", temperaturaMin: "", temperaturaMax: "", prossimaManutenzione: "" });
  };

  const salvaScadenza = (e) => {
    e.preventDefault();
    if (!formScadenza.titolo.trim() || !formScadenza.data) return alert("Inserisci titolo e data.");
    setDati(prev => ({
      ...prev,
      scadenze: [{ id: uid(), ...formScadenza }, ...prev.scadenze]
    }));
    setFormScadenza({ titolo: "", tipo: "Documento", data: "", responsabile: "Orazio Romito", note: "" });
  };

  const chiudiAnomalia = (id) => {
    setDati(prev => ({
      ...prev,
      anomalie: prev.anomalie.map(a => a.id === id ? { ...a, stato: "CHIUSA", chiusaIl: today() } : a)
    }));
  };

  const eliminaDa = (chiave, id) => {
    if (!confirm("Eliminare questo elemento?")) return;
    setDati(prev => ({
      ...prev,
      [chiave]: prev[chiave].filter(x => x.id !== id)
    }));
  };

  const scaricaBackup = () => {
    const blob = new Blob([JSON.stringify(dati, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    scaricaFile(url, "backup-omnia-haccp-pro.json");
  };

  const importaBackup = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result);
        if (!json.registrazioni || !json.azienda) throw new Error("Formato non valido");
        setDati(json);
        alert("✅ Backup importato");
      } catch {
        alert("File backup non valido.");
      }
    };
    reader.readAsText(file);
  };

  const esportaCSV = (nome, righe) => {
    if (!righe.length) return alert("Non ci sono dati da esportare.");
    const headers = Object.keys(righe[0]);
    const csv = [
      headers.join(";"),
      ...righe.map(r => headers.map(h => `"${String(r[h] ?? "").replaceAll('"', '""')}"`).join(";"))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    scaricaFile(url, nome + ".csv");
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
            <p>HACCP PRO V2</p>
          </div>
        </div>

        <nav>
          <button onClick={() => setTab("dashboard")} className={tab === "dashboard" ? "active" : ""}><Home size={19} /> Dashboard</button>
          <button onClick={() => setTab("registri")} className={tab === "registri" ? "active" : ""}><ClipboardList size={19} /> Registri</button>
          <button onClick={() => setTab("formazione")} className={tab === "formazione" ? "active" : ""}><GraduationCap size={19} /> Formazione</button>
          <button onClick={() => setTab("anagrafiche")} className={tab === "anagrafiche" ? "active" : ""}><Database size={19} /> Anagrafiche</button>
          <button onClick={() => setTab("scadenze")} className={tab === "scadenze" ? "active" : ""}><Bell size={19} /> Scadenze</button>
          <button onClick={() => setTab("anomalie")} className={tab === "anomalie" ? "active" : ""}><AlertTriangle size={19} /> Anomalie</button>
          <button onClick={() => setTab("azienda")} className={tab === "azienda" ? "active" : ""}><Settings size={19} /> Azienda</button>
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
            <Header titolo="Dashboard HACCP" sottotitolo="Controllo generale, scadenze, anomalie e registri" />

            <section className="hero">
              <div>
                <p className="eyebrow">Stato generale</p>
                <h2>
                  {riepilogo.statoGenerale === "rosso" && "Ci sono elementi da sistemare"}
                  {riepilogo.statoGenerale === "arancio" && "Ci sono scadenze vicine"}
                  {riepilogo.statoGenerale === "verde" && "Tutto regolare"}
                </h2>
                <p>
                  La dashboard controlla anomalie aperte, formazione HACCP, prodotti, scadenze documentali e manutenzioni.
                </p>
              </div>
              <div className={"bigLight " + riepilogo.statoGenerale}>
                {riepilogo.statoGenerale === "rosso" ? "ROSSO" : riepilogo.statoGenerale === "arancio" ? "ARANCIO" : "VERDE"}
              </div>
            </section>

            <section className="cards4">
              <StatCard label="Controlli oggi" value={riepilogo.registrazioniOggi} />
              <StatCard label="Anomalie aperte" value={riepilogo.anomalieAperte} danger={riepilogo.anomalieAperte > 0} />
              <StatCard label="Scaduti" value={riepilogo.scaduti} danger={riepilogo.scaduti > 0} />
              <StatCard label="In scadenza" value={riepilogo.inScadenza} warning={riepilogo.inScadenza > 0} />
            </section>

            <section className="cards4">
              <StatCard label="Fornitori" value={riepilogo.fornitori} />
              <StatCard label="Prodotti" value={riepilogo.prodotti} />
              <StatCard label="Attrezzature" value={riepilogo.attrezzature} />
              <StatCard label="Moduli HACCP" value={moduliBase.length} />
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
            <Header titolo="Registri HACCP" sottotitolo="Registra controlli, conformità, anomalie e azioni correttive" />

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
                    list={listNameForModulo(moduloAttivo)}
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
              <div className="panelHead">
                <h3>Ultime registrazioni</h3>
                <button className="secondary" onClick={() => esportaCSV("registrazioni-haccp", dati.registrazioni)}>
                  <FileDown size={17} /> Esporta CSV
                </button>
              </div>

              <DataTable
                columns={["Data", "Modulo", "Voce", "Dettaglio", "Esito", "Operatore", ""]}
                rows={dati.registrazioni.slice(0, 60).map(r => [
                  r.data + " " + r.ora,
                  nomeModulo(r.modulo),
                  r.voce,
                  r.dettaglio || "-",
                  <Badge tipo={r.esito === "ANOMALIA" ? "danger" : "ok"}>{r.esito}</Badge>,
                  r.operatore,
                  <button className="iconBtn" onClick={() => eliminaDa("registrazioni", r.id)}><Trash2 size={16} /></button>
                ])}
              />
            </section>
          </>
        )}

        {tab === "formazione" && (
          <>
            <Header titolo="Formazione HACCP" sottotitolo="Scadenze operatori, attestati, corsi e storico rinnovi" />

            <section className="panel">
              <form className="formGrid" onSubmit={salvaFormazione}>
                <label>
                  Operaio / dipendente *
                  <input value={formFormazione.nome} onChange={e => setFormFormazione(p => ({ ...p, nome: e.target.value }))} list="staff-list" placeholder="Seleziona o scrivi nome" />
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

                <button className="primary full" type="submit"><Plus size={18} /> Salva formazione</button>
              </form>
            </section>

            <section className="panel">
              <h3>Situazione attuale formazione</h3>
              <DataTable
                columns={["Nome", "Corso", "Rilascio", "Scadenza", "Stato", "Note"]}
                rows={ultimeFormazioniValide.map(f => {
                  const st = statoScadenza(f.scadenza);
                  return [
                    f.nome,
                    f.corso,
                    f.rilascio || "-",
                    f.scadenza,
                    <Badge tipo={st === "scaduto" ? "danger" : st === "scadenza" ? "warning" : "ok"}>{statoLabel[st]}</Badge>,
                    f.note || "-"
                  ];
                })}
              />
            </section>

            <section className="panel">
              <h3>Storico rinnovi formazione</h3>
              <DataTable
                columns={["Inserito", "Nome", "Corso", "Scadenza", ""]}
                rows={dati.formazione.map(f => [
                  f.dataInserimento,
                  f.nome,
                  f.corso,
                  f.scadenza,
                  <button className="iconBtn" onClick={() => eliminaDa("formazione", f.id)}><Trash2 size={16} /></button>
                ])}
              />
            </section>
          </>
        )}

        {tab === "anagrafiche" && (
          <>
            <Header titolo="Anagrafiche" sottotitolo="Fornitori, prodotti, allergeni, attrezzature e dati base" />

            <section className="panel">
              <div className="tabs">
                <button className={sottoTab === "fornitori" ? "selected" : ""} onClick={() => setSottoTab("fornitori")}><Factory size={16} /> Fornitori</button>
                <button className={sottoTab === "prodotti" ? "selected" : ""} onClick={() => setSottoTab("prodotti")}><PackageCheck size={16} /> Prodotti</button>
                <button className={sottoTab === "attrezzature" ? "selected" : ""} onClick={() => setSottoTab("attrezzature")}><Boxes size={16} /> Attrezzature</button>
              </div>

              {sottoTab === "fornitori" && (
                <>
                  <form className="formGrid" onSubmit={salvaFornitore}>
                    <label>Nome fornitore *<input value={formFornitore.nome} onChange={e => setFormFornitore(p => ({ ...p, nome: e.target.value }))} /></label>
                    <label>Categoria<input value={formFornitore.categoria} onChange={e => setFormFornitore(p => ({ ...p, categoria: e.target.value }))} /></label>
                    <label>Telefono<input value={formFornitore.telefono} onChange={e => setFormFornitore(p => ({ ...p, telefono: e.target.value }))} /></label>
                    <label>Email<input value={formFornitore.email} onChange={e => setFormFornitore(p => ({ ...p, email: e.target.value }))} /></label>
                    <label className="full">Note<input value={formFornitore.note} onChange={e => setFormFornitore(p => ({ ...p, note: e.target.value }))} /></label>
                    <button className="primary full" type="submit"><Plus size={18} /> Aggiungi fornitore</button>
                  </form>

                  <DataTable
                    columns={["Nome", "Categoria", "Telefono", "Email", "Note", ""]}
                    rows={dati.fornitori.map(f => [f.nome, f.categoria, f.telefono || "-", f.email || "-", f.note || "-", <button className="iconBtn" onClick={() => eliminaDa("fornitori", f.id)}><Trash2 size={16} /></button>])}
                  />
                </>
              )}

              {sottoTab === "prodotti" && (
                <>
                  <form className="formGrid" onSubmit={salvaProdotto}>
                    <label>Nome prodotto *<input value={formProdotto.nome} onChange={e => setFormProdotto(p => ({ ...p, nome: e.target.value }))} /></label>
                    <label>Categoria<input value={formProdotto.categoria} onChange={e => setFormProdotto(p => ({ ...p, categoria: e.target.value }))} placeholder="Es. panineria, pizzeria..." /></label>
                    <label>Lotto<input value={formProdotto.lotto} onChange={e => setFormProdotto(p => ({ ...p, lotto: e.target.value }))} /></label>
                    <label>Scadenza<input type="date" value={formProdotto.scadenza} onChange={e => setFormProdotto(p => ({ ...p, scadenza: e.target.value }))} /></label>

                    <div className="full">
                      <p className="miniTitle">Allergeni</p>
                      <div className="chips">
                        {allergeniUE.map(a => (
                          <button type="button" key={a} className={formProdotto.allergeni.includes(a) ? "chip selected" : "chip"} onClick={() => {
                            setFormProdotto(p => ({
                              ...p,
                              allergeni: p.allergeni.includes(a) ? p.allergeni.filter(x => x !== a) : [...p.allergeni, a]
                            }));
                          }}>{a}</button>
                        ))}
                      </div>
                    </div>

                    <label className="full">Note<input value={formProdotto.note} onChange={e => setFormProdotto(p => ({ ...p, note: e.target.value }))} /></label>
                    <button className="primary full" type="submit"><Plus size={18} /> Aggiungi prodotto</button>
                  </form>

                  <DataTable
                    columns={["Prodotto", "Categoria", "Lotto", "Scadenza", "Allergeni", "Stato", ""]}
                    rows={dati.prodotti.map(p => {
                      const st = statoScadenza(p.scadenza);
                      return [
                        p.nome,
                        p.categoria || "-",
                        p.lotto || "-",
                        p.scadenza || "-",
                        p.allergeni?.join(", ") || "-",
                        p.scadenza ? <Badge tipo={st === "scaduto" ? "danger" : st === "scadenza" ? "warning" : "ok"}>{statoLabel[st]}</Badge> : "-",
                        <button className="iconBtn" onClick={() => eliminaDa("prodotti", p.id)}><Trash2 size={16} /></button>
                      ];
                    })}
                  />
                </>
              )}

              {sottoTab === "attrezzature" && (
                <>
                  <form className="formGrid" onSubmit={salvaAttrezzatura}>
                    <label>Nome attrezzatura *<input value={formAttrezzatura.nome} onChange={e => setFormAttrezzatura(p => ({ ...p, nome: e.target.value }))} placeholder="Es. Cella 1" /></label>
                    <label>Tipo<select value={formAttrezzatura.tipo} onChange={e => setFormAttrezzatura(p => ({ ...p, tipo: e.target.value }))}><option>Frigo</option><option>Freezer</option><option>Forno</option><option>Friggitrice</option><option>Abbattitore</option><option>Bilancia</option><option>Altro</option></select></label>
                    <label>Posizione<input value={formAttrezzatura.posizione} onChange={e => setFormAttrezzatura(p => ({ ...p, posizione: e.target.value }))} /></label>
                    <label>Temp. minima<input value={formAttrezzatura.temperaturaMin} onChange={e => setFormAttrezzatura(p => ({ ...p, temperaturaMin: e.target.value }))} /></label>
                    <label>Temp. massima<input value={formAttrezzatura.temperaturaMax} onChange={e => setFormAttrezzatura(p => ({ ...p, temperaturaMax: e.target.value }))} /></label>
                    <label>Prossima manutenzione<input type="date" value={formAttrezzatura.prossimaManutenzione} onChange={e => setFormAttrezzatura(p => ({ ...p, prossimaManutenzione: e.target.value }))} /></label>
                    <button className="primary full" type="submit"><Plus size={18} /> Aggiungi attrezzatura</button>
                  </form>

                  <DataTable
                    columns={["Nome", "Tipo", "Posizione", "Range", "Manutenzione", "Stato", ""]}
                    rows={dati.attrezzature.map(a => {
                      const st = statoScadenza(a.prossimaManutenzione);
                      return [
                        a.nome,
                        a.tipo,
                        a.posizione || "-",
                        `${a.temperaturaMin || "-"} / ${a.temperaturaMax || "-"}`,
                        a.prossimaManutenzione || "-",
                        a.prossimaManutenzione ? <Badge tipo={st === "scaduto" ? "danger" : st === "scadenza" ? "warning" : "ok"}>{statoLabel[st]}</Badge> : "-",
                        <button className="iconBtn" onClick={() => eliminaDa("attrezzature", a.id)}><Trash2 size={16} /></button>
                      ];
                    })}
                  />
                </>
              )}
            </section>
          </>
        )}

        {tab === "scadenze" && (
          <>
            <Header titolo="Scadenziario" sottotitolo="Documenti, certificati, manutenzioni, corsi e prodotti in scadenza" />

            <section className="panel">
              <form className="formGrid" onSubmit={salvaScadenza}>
                <label>Titolo *<input value={formScadenza.titolo} onChange={e => setFormScadenza(p => ({ ...p, titolo: e.target.value }))} placeholder="Es. certificato disinfestazione" /></label>
                <label>Tipo<select value={formScadenza.tipo} onChange={e => setFormScadenza(p => ({ ...p, tipo: e.target.value }))}><option>Documento</option><option>Manutenzione</option><option>Corso</option><option>Prodotto</option><option>Contratto</option><option>Altro</option></select></label>
                <label>Data scadenza *<input type="date" value={formScadenza.data} onChange={e => setFormScadenza(p => ({ ...p, data: e.target.value }))} /></label>
                <label>Responsabile<input value={formScadenza.responsabile} onChange={e => setFormScadenza(p => ({ ...p, responsabile: e.target.value }))} list="staff-list" /></label>
                <label className="full">Note<input value={formScadenza.note} onChange={e => setFormScadenza(p => ({ ...p, note: e.target.value }))} /></label>
                <button className="primary full" type="submit"><Plus size={18} /> Aggiungi scadenza</button>
              </form>
            </section>

            <section className="panel">
              <h3>Tutte le scadenze</h3>
              <DataTable
                columns={["Titolo", "Tipo", "Data", "Responsabile", "Stato", "Note", ""]}
                rows={dati.scadenze.map(s => {
                  const st = statoScadenza(s.data);
                  return [
                    s.titolo,
                    s.tipo,
                    s.data,
                    s.responsabile,
                    <Badge tipo={st === "scaduto" ? "danger" : st === "scadenza" ? "warning" : "ok"}>{statoLabel[st]}</Badge>,
                    s.note || "-",
                    <button className="iconBtn" onClick={() => eliminaDa("scadenze", s.id)}><Trash2 size={16} /></button>
                  ];
                })}
              />
            </section>
          </>
        )}

        {tab === "anomalie" && (
          <>
            <Header titolo="Anomalie e azioni correttive" sottotitolo="Gestisci non conformità aperte e chiuse" />

            <section className="panel">
              <DataTable
                columns={["Data", "Modulo", "Problema", "Azione", "Stato", "Operatore", ""]}
                rows={dati.anomalie.map(a => [
                  a.data,
                  nomeModulo(a.modulo),
                  a.titolo,
                  a.azione,
                  <Badge tipo={a.stato === "CHIUSA" ? "ok" : "danger"}>{a.stato}</Badge>,
                  a.operatore,
                  a.stato !== "CHIUSA" ? <button className="smallBtn" onClick={() => chiudiAnomalia(a.id)}>Chiudi</button> : "-"
                ])}
              />
            </section>
          </>
        )}

        {tab === "azienda" && (
          <>
            <Header titolo="Azienda, backup e impostazioni" sottotitolo="Dati attività, personale, esportazione e importazione" />

            <section className="panel">
              <div className="formGrid">
                <label>Ragione sociale<input value={dati.azienda.nome} onChange={e => setDati(p => ({ ...p, azienda: { ...p.azienda, nome: e.target.value } }))} /></label>
                <label>P.IVA<input value={dati.azienda.piva} onChange={e => setDati(p => ({ ...p, azienda: { ...p.azienda, piva: e.target.value } }))} /></label>
                <label>Sede<input value={dati.azienda.sede} onChange={e => setDati(p => ({ ...p, azienda: { ...p.azienda, sede: e.target.value } }))} /></label>
                <label>Responsabile HACCP<input value={dati.azienda.responsabile} onChange={e => setDati(p => ({ ...p, azienda: { ...p.azienda, responsabile: e.target.value } }))} /></label>
              </div>
            </section>

            <section className="panel">
              <h3>Staff</h3>
              <StaffEditor dati={dati} setDati={setDati} />
            </section>

            <section className="panel">
              <h3>Backup e esportazioni</h3>
              <div className="actionsGrid">
                <button className="secondary" onClick={scaricaBackup}><Download size={18} /> Scarica backup JSON</button>

                <label className="uploadBtn">
                  <Upload size={18} /> Importa backup JSON
                  <input type="file" accept="application/json" onChange={e => e.target.files?.[0] && importaBackup(e.target.files[0])} />
                </label>

                <button className="secondary" onClick={() => esportaCSV("registrazioni-haccp", dati.registrazioni)}><FileDown size={18} /> Esporta registrazioni CSV</button>
                <button className="secondary" onClick={() => esportaCSV("formazione-haccp", dati.formazione)}><FileDown size={18} /> Esporta formazione CSV</button>
              </div>
            </section>

            <section className="panel muted">
              <FileText size={22} />
              <div>
                <h3>Prossimo step V3</h3>
                <p>Colleghiamo Firebase, GitHub e Vercel. Poi aggiungiamo foto DDT/FIR, allegati attestati, PDF professionali e importazione dati dalla vecchia app Google Sheet.</p>
              </div>
            </section>
          </>
        )}

        <datalist id="staff-list">
          {dati.staff.map(s => <option key={s.id} value={s.nome} />)}
        </datalist>

        <datalist id="fornitori-list">
          {dati.fornitori.map(f => <option key={f.id} value={f.nome} />)}
        </datalist>

        <datalist id="prodotti-list">
          {dati.prodotti.map(p => <option key={p.id} value={p.nome} />)}
        </datalist>

        <datalist id="attrezzature-list">
          {dati.attrezzature.map(a => <option key={a.id} value={a.nome} />)}
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

function DataTable({ columns, rows }) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>{columns.map((c, i) => <th key={i}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="empty">Nessun dato presente</td></tr>
          ) : rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StaffEditor({ dati, setDati }) {
  const [nome, setNome] = useState("");
  const [ruolo, setRuolo] = useState("Operatore");

  const aggiungi = () => {
    if (!nome.trim()) return;
    setDati(prev => ({
      ...prev,
      staff: [...prev.staff, { id: uid(), nome: nome.trim(), ruolo }]
    }));
    setNome("");
    setRuolo("Operatore");
  };

  return (
    <>
      <div className="inlineAdd">
        <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome nuovo operatore" />
        <select value={ruolo} onChange={e => setRuolo(e.target.value)}>
          <option>Operatore</option>
          <option>Responsabile HACCP</option>
          <option>Admin</option>
          <option>Consulente</option>
        </select>
        <button className="primary" onClick={aggiungi}>Aggiungi</button>
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
    </>
  );
}

function nomeModulo(id) {
  return moduliBase.find(m => m.id === id)?.nome || id;
}

function listNameForModulo(modulo) {
  if (modulo === "merci") return "fornitori-list";
  if (modulo === "temperature" || modulo === "manutenzioni" || modulo === "tarature") return "attrezzature-list";
  if (modulo === "allergeni" || modulo === "cotture" || modulo === "abbattimento") return "prodotti-list";
  return "";
}

function placeholderVoce(modulo) {
  const map = {
    temperature: "Es. Cella 1, frigo banco, freezer...",
    pulizie: "Es. Cucina, banco, bagno, magazzino...",
    merci: "Es. fornitore o prodotto ricevuto...",
    oli: "Es. ditta ritiro olio esausto...",
    manutenzioni: "Es. friggitrice, abbattitore, frigo...",
    formazione: "Es. nome operatore...",
    infestanti: "Es. controllo esca cucina...",
    tarature: "Es. termometro digitale...",
    cotture: "Es. pollo, salsiccia, preparazione...",
    abbattimento: "Es. sugo, preparazione raffreddata...",
    allergeni: "Es. prodotto / ingrediente controllato...",
    rifiuti: "Es. ritiro rifiuti / documento..."
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
    formazione: "Es. corso e scadenza",
    infestanti: "Es. esca integra / nessuna presenza",
    tarature: "Es. confronto con termometro campione",
    cotture: "Es. temperatura al cuore 75 °C",
    abbattimento: "Es. da 65 °C a 10 °C in 2 ore",
    allergeni: "Es. rischio contaminazione verificato",
    rifiuti: "Es. formulario / ditta incaricata"
  };
  return map[modulo] || "Dettaglio";
}

function scaricaFile(url, nome) {
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
