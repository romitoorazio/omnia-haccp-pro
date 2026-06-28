import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Bell,
  Boxes,
  Bug,
  Camera,
  CheckCircle2,
  ClipboardList,
  Database,
  Download,
  Factory,
  FileDown,
  FileText,
  Flame,
  Gauge,
  GraduationCap,
  Home,
  Image,
  PackageCheck,
  Plus,
  Printer,
  Search,
  Settings,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Thermometer,
  Trash2,
  Truck,
  Upload,
  UserRound,
  Wrench,
  Droplets,
  Apple
} from "lucide-react";
import { auth, db, storage } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import "./index.css";

const STORAGE_KEY = "omnia_haccp_pro_v3";
const OLD_KEYS = ["omnia_haccp_pro_v2", "omnia_haccp_pro_v1"];

const moduliBase = [
  { id: "temperature", nome: "Temperature", icona: Thermometer, descrizione: "Frigo, celle, freezer, banco frigo" },
  { id: "pulizie", nome: "Pulizie", icona: Sparkles, descrizione: "Sanificazioni giornaliere e straordinarie" },
  { id: "merci", nome: "Merci in entrata", icona: Truck, descrizione: "DDT, fatture, fornitori, lotti e scadenze" },
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
  "Glutine", "Crostacei", "Uova", "Pesce", "Arachidi", "Soia", "Latte",
  "Frutta a guscio", "Sedano", "Senape", "Sesamo", "Solfiti", "Lupini", "Molluschi"
];

const attrezzatureStandard = [
  { nome: "Cella 1", temp: "+4 °C", tipo: "Frigo", posizione: "Cucina", min: "0", max: "4" },
  { nome: "Cella 2", temp: "+4 °C", tipo: "Frigo", posizione: "Cucina", min: "0", max: "4" },
  { nome: "Cella 3", temp: "+4 °C", tipo: "Frigo", posizione: "Cucina", min: "0", max: "4" },
  { nome: "Cella 4", temp: "+4 °C", tipo: "Frigo", posizione: "Cucina", min: "0", max: "4" },
  { nome: "Cella 5", temp: "+4 °C", tipo: "Frigo", posizione: "Cucina", min: "0", max: "4" },
  { nome: "Cella 6", temp: "+4 °C", tipo: "Frigo", posizione: "Cucina", min: "0", max: "4" },
  { nome: "Cella 7", temp: "+4 °C", tipo: "Frigo", posizione: "Cucina", min: "0", max: "4" },
  { nome: "Frigo 3", temp: "-18 °C", tipo: "Freezer", posizione: "Cucina", min: "-22", max: "-18" },
  { nome: "Frigo 4", temp: "+4 °C", tipo: "Frigo", posizione: "Cucina", min: "0", max: "4" },
  { nome: "Frigo 5", temp: "+4 °C", tipo: "Frigo", posizione: "Cucina", min: "0", max: "4" },
  { nome: "Frigo 6", temp: "+4 °C", tipo: "Frigo", posizione: "Cucina", min: "0", max: "4" },
  { nome: "Frigo 7", temp: "+4 °C", tipo: "Frigo", posizione: "Cucina", min: "0", max: "4" }
];

const celleStandard = attrezzatureStandard.map(a => a.nome);

const pulizieStandard = [
  "CUCINA",
  "SALA",
  "MAGAZZINO",
  "BAGNI",
  "TAVOLA CALDA",
  "TAVOLA FREDDA",
  "FRY TOP"
];

const today = () => new Date().toISOString().slice(0, 10);

const uid = () => {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "id_" + Date.now() + "_" + Math.random().toString(16).slice(2);
};

const datiIniziali = () => ({
  azienda: {
    nome: "Pizzaschetta e Maritata",
    piva: "",
    sede: "Gela",
    responsabile: "Orazio Romito"
  },
  staff: [
    { id: uid(), nome: "Orazio Romito", ruolo: "Responsabile HACCP" },
    { id: uid(), nome: "AutoPilot", ruolo: "Sistema automatico" }
  ],
  fornitori: [],
  prodotti: [],
  attrezzature: attrezzatureStandard.map((a, index) => ({
    id: "att_" + (index + 1),
    nome: a.nome,
    tipo: a.tipo,
    posizione: a.posizione,
    temperaturaMin: a.min,
    temperaturaMax: a.max,
    prossimaManutenzione: ""
  })),
  formazione: [],
  registrazioni: [],
  anomalie: [],
  scadenze: [],
  documenti: []
});

function normVoce(v) {
  return String(v || "").trim().toUpperCase().replace(/\s+/g, " ");
}

function sincronizzaAttrezzature(attrezzature) {
  const out = [];
  const viste = new Set();

  (Array.isArray(attrezzature) ? attrezzature : []).forEach(a => {
    if (!a || !a.nome) return;
    const key = normVoce(a.nome);
    if (viste.has(key)) return;
    viste.add(key);
    out.push(a);
  });

  attrezzatureStandard.forEach((a, index) => {
    const key = normVoce(a.nome);
    if (viste.has(key)) return;
    viste.add(key);
    out.push({
      id: "att_pdf_" + (index + 1),
      nome: a.nome,
      tipo: a.tipo,
      posizione: a.posizione,
      temperaturaMin: a.min,
      temperaturaMax: a.max,
      prossimaManutenzione: ""
    });
  });

  return out;
}

function normalizzaDati(input) {
  const base = datiIniziali();
  const d = input || {};
  const staff = Array.isArray(d.staff) ? d.staff : base.staff;

  const haAutoPilot = staff.some(s => (s.nome || "").toLowerCase() === "autopilot");

  return {
    ...base,
    ...d,
    azienda: { ...base.azienda, ...(d.azienda || {}) },
    staff: haAutoPilot ? staff : [...staff, { id: uid(), nome: "AutoPilot", ruolo: "Sistema automatico" }],
    fornitori: Array.isArray(d.fornitori) ? d.fornitori : [],
    prodotti: Array.isArray(d.prodotti) ? d.prodotti : [],
    attrezzature: sincronizzaAttrezzature(Array.isArray(d.attrezzature) && d.attrezzature.length ? d.attrezzature : base.attrezzature),
    formazione: Array.isArray(d.formazione) ? d.formazione : [],
    registrazioni: Array.isArray(d.registrazioni) ? d.registrazioni : [],
    anomalie: Array.isArray(d.anomalie) ? d.anomalie : [],
    scadenze: Array.isArray(d.scadenze) ? d.scadenze : [],
    documenti: Array.isArray(d.documenti) ? d.documenti : []
  };
}

function caricaLocale() {
  const keys = [STORAGE_KEY, ...OLD_KEYS];
  for (const k of keys) {
    const raw = localStorage.getItem(k);
    if (!raw) continue;
    try {
      return normalizzaDati(JSON.parse(raw));
    } catch {
      continue;
    }
  }
  return datiIniziali();
}

function statoScadenza(dataScadenza) {
  if (!dataScadenza) return "mancante";
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const scad = new Date(dataScadenza);
  scad.setHours(0, 0, 0, 0);
  const giorni = Math.ceil((scad - oggi) / (1000 * 60 * 60 * 24));
  if (giorni < 0) return "scaduto";
  if (giorni <= 30) return "scadenza";
  return "valido";
}

const statoLabel = {
  valido: "Valido",
  scadenza: "In scadenza",
  scaduto: "Scaduto",
  mancante: "Da completare"
};

function giorniDelMese(mese, anno, finoOggi = false) {
  const last = new Date(Number(anno), Number(mese), 0).getDate();
  const oggi = new Date();
  const limite = finoOggi && oggi.getFullYear() === Number(anno) && oggi.getMonth() + 1 === Number(mese)
    ? oggi.getDate()
    : last;

  const giorni = [];
  for (let g = 1; g <= limite; g++) {
    giorni.push(`${anno}-${String(mese).padStart(2, "0")}-${String(g).padStart(2, "0")}`);
  }
  return giorni;
}

function generaAutomatichePeriodo(dati, mese, anno, finoOggi = true) {
  const out = normalizzaDati(dati);
  const registrazioni = [...out.registrazioni];

  const esistentiAuto = new Set(registrazioni.map(r => r.autoKey).filter(Boolean));
  const esistentiVoce = new Set(
    registrazioni.map(r => `${r.data}|${r.modulo}|${normVoce(r.voce)}`)
  );

  giorniDelMese(mese, anno, finoOggi).forEach(data => {
    attrezzatureStandard.forEach(att => {
      const key = `${data}|AUTO_TEMP|${att.nome}`;
      const voceKey = `${data}|temperature|${normVoce(att.nome)}`;

      if (!esistentiAuto.has(key) && !esistentiVoce.has(voceKey)) {
        registrazioni.unshift({
          id: uid(),
          data,
          ora: "06:00",
          modulo: "temperature",
          voce: att.nome,
          dettaglio: att.temp,
          esito: "CONFORME",
          azione: "",
          operatore: "AutoPilot",
          automatico: true,
          autoKey: key
        });
        esistentiAuto.add(key);
        esistentiVoce.add(voceKey);
      }
    });

    pulizieStandard.forEach(area => {
      const key = `${data}|AUTO_PULIZIA|${area}`;
      const voceKey = `${data}|pulizie|${normVoce(area)}`;

      if (!esistentiAuto.has(key) && !esistentiVoce.has(voceKey)) {
        registrazioni.unshift({
          id: uid(),
          data,
          ora: "07:00",
          modulo: "pulizie",
          voce: area,
          dettaglio: "DISINFETTANTE",
          esito: "CONFORME",
          azione: "",
          operatore: "AutoPilot",
          automatico: true,
          autoKey: key
        });
        esistentiAuto.add(key);
        esistentiVoce.add(voceKey);
      }
    });
  });

  return { ...out, registrazioni };
}

function generaAutomaticheOggi(dati) {
  const now = new Date();
  return generaAutomatichePeriodo(dati, String(now.getMonth() + 1), String(now.getFullYear()), true);
}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function attendiUtenteFirebase(maxMs = 8000) {
  const start = Date.now();

  while (!auth.currentUser && Date.now() - start < maxMs) {
    await sleep(150);
  }

  if (!auth.currentUser) {
    throw new Error("Accesso Firebase non pronto. Ricarica la pagina e riprova.");
  }

  return auth.currentUser;
}

function conTimeout(promise, ms, messaggio) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(messaggio)), ms);
    })
  ]);
}

async function comprimiImmagineSeServe(file) {
  if (!file || !file.type || !file.type.startsWith("image/")) return file;

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise(resolve => {
    canvas.toBlob(resolve, "image/jpeg", 0.82);
  });

  if (!blob) return file;

  const nuovoNome = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], nuovoNome, { type: "image/jpeg" });
}

async function caricaFileStorage(file, cartella) {
  await attendiUtenteFirebase();

  const fileOk = await comprimiImmagineSeServe(file);
  const safeName = fileOk.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `aziende/pizzaschetta/${cartella}/${Date.now()}_${safeName}`;
  const refFile = storageRef(storage, path);

  await conTimeout(
    uploadBytes(refFile, fileOk),
    25000,
    "Caricamento troppo lungo. Controlla Firebase Storage o la connessione."
  );

  const url = await conTimeout(
    getDownloadURL(refFile),
    12000,
    "File caricato ma non riesco a prendere il link."
  );

  return {
    fileName: fileOk.name,
    fileType: fileOk.type,
    url,
    storagePath: path
  };
}



async function caricaFileCloudinary(file, cartella) {
  const fileOk = await comprimiImmagineSeServe(file);

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dnpbz05pr";
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "omnia_haccp";

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary non configurato.");
  }

  const form = new FormData();
  form.append("file", fileOk);
  form.append("upload_preset", uploadPreset);
  form.append("folder", "omnia-haccp-pro/" + cartella);

  const response = await conTimeout(
    fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: "POST",
      body: form
    }),
    120000,
    "Caricamento troppo lungo verso Cloudinary."
  );

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json?.error?.message || "Upload Cloudinary non riuscito.");
  }

  return {
    fileName: fileOk.name,
    fileType: fileOk.type,
    url: json.secure_url,
    storagePath: json.public_id || "",
    cloudinary: true,
    bytes: json.bytes || fileOk.size
  };
}


export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [sottoTab, setSottoTab] = useState("fornitori");
  const [moduloAttivo, setModuloAttivo] = useState("temperature");
  const [search, setSearch] = useState("");
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Avvio Firebase...");
  const [uploadStatus, setUploadStatus] = useState("");

  const [dati, setDati] = useState(() => generaAutomaticheOggi(caricaLocale()));

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

  const [formDocumento, setFormDocumento] = useState({
    tipo: "Fattura",
    fornitore: "",
    numero: "",
    dataDocumento: today(),
    importo: "",
    controllo: "CONFORME",
    note: "",
    operatore: "Orazio Romito"
  });

  const [fileDocumento, setFileDocumento] = useState(null);
  const [fileRegistro, setFileRegistro] = useState(null);

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

  const [stampa, setStampa] = useState({
    mese: String(new Date().getMonth() + 1),
    anno: String(new Date().getFullYear()),
    tipo: "temperature"
  });

  useEffect(() => {
    let alive = true;

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || !alive) return;

      try {
        setSyncStatus("Caricamento dati cloud...");
        const refDb = doc(db, "aziende", "pizzaschetta", "database", "main");
        const snap = await getDoc(refDb);

        let payload = snap.exists() && snap.data()?.payload
          ? snap.data().payload
          : caricaLocale();

        payload = generaAutomaticheOggi(normalizzaDati(payload));

        if (alive) {
          setDati(payload);
          setCloudLoaded(true);
          setSyncStatus("Firebase collegato");
        }

        await setDoc(refDb, {
          payload,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.error(error);
        if (alive) {
          setCloudLoaded(true);
          setSyncStatus("Errore Firebase - uso locale");
        }
      }
    });

    return () => {
      alive = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dati));

    if (!cloudLoaded) return;

    const timer = setTimeout(async () => {
      try {
        setSyncStatus("Salvataggio cloud...");
        const refDb = doc(db, "aziende", "pizzaschetta", "database", "main");
        await setDoc(refDb, {
          payload: normalizzaDati(dati),
          updatedAt: serverTimestamp()
        }, { merge: true });
        setSyncStatus("Sincronizzato");
      } catch (error) {
        console.error(error);
        setSyncStatus("Errore salvataggio cloud");
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [dati, cloudLoaded]);

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
      documenti: dati.documenti.length,
      fornitori: dati.fornitori.length,
      prodotti: dati.prodotti.length,
      attrezzature: dati.attrezzature.length
    };
  }, [dati, ultimeFormazioniValide]);

  const registraControllo = async (e) => {
    e.preventDefault();

    if (!formRegistro.voce.trim()) {
      alert("Inserisci la voce del controllo.");
      return;
    }

    if (formRegistro.esito === "ANOMALIA" && formRegistro.azione.trim().length < 5) {
      alert("Per una anomalia devi scrivere l'azione correttiva.");
      return;
    }

    let registroAllegato = null;

    if (fileRegistro && formRegistro.modulo === "merci") {
      try {
        registroAllegato = await caricaFileStorage(fileRegistro, "merci");
      } catch (error) {
        console.error(error);
        alert(error?.message || "Errore caricamento allegato merci. Controlla Firebase Storage.");
        return;
      }
    }

    const nuova = {
      id: uid(),
      data: today(),
      ora: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
      ...formRegistro,
      urlDocumento: registroAllegato?.url || "",
      fileName: registroAllegato?.fileName || ""
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

      const documentiExtra = registroAllegato ? [{
        id: uid(),
        tipo: "Merci in entrata",
        fornitore: formRegistro.voce,
        numero: "",
        dataDocumento: today(),
        importo: "",
        controllo: formRegistro.esito,
        note: formRegistro.dettaglio,
        operatore: formRegistro.operatore,
        fileName: registroAllegato.fileName,
        fileType: registroAllegato.fileType,
        url: registroAllegato.url,
        storagePath: registroAllegato.storagePath,
        uploadedAt: today()
      }] : [];

      return {
        ...prev,
        registrazioni: [nuova, ...prev.registrazioni],
        documenti: [...documentiExtra, ...(prev.documenti || [])],
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
    setFileRegistro(null);

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

  const salvaDocumento = async (e) => {
    e.preventDefault();

    if (!fileDocumento) {
      alert("Scatta o seleziona una foto/documento.");
      return;
    }

    try {
      setUploadStatus("Caricamento documento...");

      const caricato = await caricaFileCloudinary(fileDocumento, `documenti/${formDocumento.tipo}`);

      const nuovoDocumento = {
        id: uid(),
        ...formDocumento,
        fileName: caricato.fileName,
        fileType: caricato.fileType,
        url: caricato.url,
        storagePath: caricato.storagePath,
        uploadedAt: today()
      };

      const url = caricato.url;

      const modulo = moduloDaTipoDocumento(formDocumento.tipo);

      const nuovaRegistrazione = {
        id: uid(),
        data: today(),
        ora: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
        modulo,
        voce: formDocumento.fornitore || formDocumento.tipo,
        dettaglio: `${formDocumento.tipo} ${formDocumento.numero ? "n. " + formDocumento.numero : ""} acquisita e controllata${formDocumento.importo ? " | Importo: " + formDocumento.importo : ""}`,
        esito: formDocumento.controllo,
        azione: formDocumento.controllo === "ANOMALIA" ? formDocumento.note : "",
        operatore: formDocumento.operatore,
        urlDocumento: url
      };

      setDati(prev => {
        const anomalie = [...prev.anomalie];

        if (formDocumento.controllo === "ANOMALIA") {
          anomalie.unshift({
            id: uid(),
            data: today(),
            modulo,
            titolo: `${formDocumento.tipo} con anomalia`,
            descrizione: formDocumento.note,
            azione: formDocumento.note,
            stato: "APERTA",
            operatore: formDocumento.operatore
          });
        }

        return {
          ...prev,
          documenti: [nuovoDocumento, ...prev.documenti],
          registrazioni: [nuovaRegistrazione, ...prev.registrazioni],
          anomalie
        };
      });

      setFileDocumento(null);
      setFormDocumento({
        tipo: "Fattura",
        fornitore: "",
        numero: "",
        dataDocumento: today(),
        importo: "",
        controllo: "CONFORME",
        note: "",
        operatore: "Orazio Romito"
      });
      setUploadStatus("✅ Documento salvato e controllo registrato");
    } catch (error) {
      console.error(error);
      setUploadStatus("❌ " + (error?.message || "Errore caricamento documento"));
      alert(error?.message || "Errore nel caricamento. Controlla Storage Firebase e regole.");
    }
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
        const json = normalizzaDati(JSON.parse(reader.result));
        setDati(generaAutomaticheOggi(json));
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

  const completaAutomaticheMese = () => {
    setDati(prev => generaAutomatichePeriodo(prev, stampa.mese, stampa.anno, true));
    alert("✅ Registrazioni automatiche create per il mese selezionato");
  };

  const stampaMensile = () => {
    const righe = dati.registrazioni
      .filter(r => r.modulo === stampa.tipo)
      .filter(r => {
        const d = new Date(r.data);
        return d.getMonth() + 1 === Number(stampa.mese) && d.getFullYear() === Number(stampa.anno);
      })
      .sort((a, b) => (a.data + a.voce).localeCompare(b.data + b.voce));

    if (!righe.length) {
      alert("Nessuna riga da stampare. Prima clicca 'Completa automatiche mese'.");
      return;
    }

    const titolo = stampa.tipo === "temperature" ? "Registro Temperature" : "Registro Pulizie";
    const html = generaHtmlStampa(titolo, dati.azienda, righe, stampa.mese, stampa.anno);

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const moduliFiltrati = moduliBase.filter(m =>
    m.nome.toLowerCase().includes(search.toLowerCase()) ||
    m.descrizione.toLowerCase().includes(search.toLowerCase())
  );

  const righePreviewStampa = dati.registrazioni
    .filter(r => r.modulo === stampa.tipo)
    .filter(r => {
      const d = new Date(r.data);
      return d.getMonth() + 1 === Number(stampa.mese) && d.getFullYear() === Number(stampa.anno);
    })
    .slice(0, 80);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandIcon"><ShieldCheck size={28} /></div>
          <div>
            <h1>OMNIA</h1>
            <p>HACCP PRO V4.2</p>
          </div>
        </div>

        <nav>
          <button onClick={() => setTab("dashboard")} className={tab === "dashboard" ? "active" : ""}><Home size={19} /> Dashboard</button>
          <button onClick={() => setTab("registri")} className={tab === "registri" ? "active" : ""}><ClipboardList size={19} /> Registri</button>
          <button onClick={() => setTab("documenti")} className={tab === "documenti" ? "active" : ""}><Camera size={19} /> Documenti</button>
          <button onClick={() => setTab("stampe")} className={tab === "stampe" ? "active" : ""}><Printer size={19} /> Stampe</button>
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

        <div className="syncBox">
          <Database size={16} />
          <span>{syncStatus}</span>
        </div>
      </aside>

      <main className="content">
        {tab === "dashboard" && (
          <>
            <Header titolo="Dashboard HACCP" sottotitolo="Controllo generale, scadenze, documenti e registri automatici" />

            <section className="hero">
              <div>
                <p className="eyebrow">Stato generale</p>
                <h2>
                  {riepilogo.statoGenerale === "rosso" && "Ci sono elementi da sistemare"}
                  {riepilogo.statoGenerale === "arancio" && "Ci sono scadenze vicine"}
                  {riepilogo.statoGenerale === "verde" && "Tutto regolare"}
                </h2>
                <p>
                  Ogni apertura dell’app crea automaticamente le registrazioni standard di temperature e pulizie del mese corrente, senza duplicarle.
                </p>
              </div>
              <div className={"bigLight " + riepilogo.statoGenerale}>
                {riepilogo.statoGenerale === "rosso" ? "ROSSO" : riepilogo.statoGenerale === "arancio" ? "ARANCIO" : "VERDE"}
              </div>
            </section>

            <section className="cards4">
              <StatCard label="Controlli oggi" value={riepilogo.registrazioniOggi} />
              <StatCard label="Documenti" value={riepilogo.documenti} />
              <StatCard label="Anomalie aperte" value={riepilogo.anomalieAperte} danger={riepilogo.anomalieAperte > 0} />
              <StatCard label="Scaduti" value={riepilogo.scaduti} danger={riepilogo.scaduti > 0} />
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
            <Header titolo="Registri HACCP" sottotitolo="Registrazioni automatiche e controlli manuali" />

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

                {moduloAttivo === "merci" && (
                  <label className="full filePick">
                    Foto / PDF merce in entrata
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      capture="environment"
                      onChange={e => setFileRegistro(e.target.files?.[0] || null)}
                    />
                    <span>{fileRegistro ? "Allegato selezionato: " + fileRegistro.name : "Puoi scattare foto o importare PDF/foto da archivio"}</span>
                  </label>
                )}

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
                columns={["Data", "Modulo", "Voce", "Dettaglio", "Esito", "Operatore", "Auto", "Allegato", ""]}
                rows={dati.registrazioni.slice(0, 80).map(r => [
                  r.data + " " + (r.ora || ""),
                  nomeModulo(r.modulo),
                  r.voce,
                  r.dettaglio || "-",
                  <Badge tipo={r.esito === "ANOMALIA" ? "danger" : "ok"}>{r.esito}</Badge>,
                  r.operatore,
                  r.automatico ? "Sì" : "No",
                  r.urlDocumento ? <a className="tableLink" href={r.urlDocumento} target="_blank" rel="noreferrer">Apri</a> : "-",
                  <button className="iconBtn" onClick={() => eliminaDa("registrazioni", r.id)}><Trash2 size={16} /></button>
                ])}
              />
            </section>
          </>
        )}

        {tab === "documenti" && (
          <>
            <Header titolo="Foto documenti e fatture" sottotitolo="Scatta fatture, DDT, FIR, attestati e registra automaticamente il controllo" />

            <section className="panel">
              <form className="formGrid" onSubmit={salvaDocumento}>
                <label>
                  Tipo documento
                  <select value={formDocumento.tipo} onChange={e => setFormDocumento(p => ({ ...p, tipo: e.target.value }))}>
                    <option>Fattura</option>
                    <option>DDT</option>
                    <option>FIR olio esausto</option>
                    <option>Attestato HACCP</option>
                    <option>Rapporto tecnico</option>
                    <option>Certificato disinfestazione</option>
                    <option>Altro documento</option>
                  </select>
                </label>

                <label>
                  Fornitore / soggetto
                  <input value={formDocumento.fornitore} onChange={e => setFormDocumento(p => ({ ...p, fornitore: e.target.value }))} list="fornitori-list" />
                </label>

                <label>
                  Numero documento
                  <input value={formDocumento.numero} onChange={e => setFormDocumento(p => ({ ...p, numero: e.target.value }))} placeholder="Numero fattura/DDT/FIR" />
                </label>

                <label>
                  Data documento
                  <input type="date" value={formDocumento.dataDocumento} onChange={e => setFormDocumento(p => ({ ...p, dataDocumento: e.target.value }))} />
                </label>

                <label>
                  Importo
                  <input value={formDocumento.importo} onChange={e => setFormDocumento(p => ({ ...p, importo: e.target.value }))} placeholder="Facoltativo" />
                </label>

                <label>
                  Esito controllo
                  <select value={formDocumento.controllo} onChange={e => setFormDocumento(p => ({ ...p, controllo: e.target.value }))}>
                    <option value="CONFORME">✅ Conforme</option>
                    <option value="ANOMALIA">❌ Anomalia</option>
                  </select>
                </label>

                <label>
                  Operatore
                  <select value={formDocumento.operatore} onChange={e => setFormDocumento(p => ({ ...p, operatore: e.target.value }))}>
                    {dati.staff.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                  </select>
                </label>

                <label>
                  Foto / file
                  <input type="file" accept="image/*,.pdf" capture="environment" onChange={e => setFileDocumento(e.target.files?.[0] || null)} />
                </label>

                <label className="full">
                  Note controllo
                  <input value={formDocumento.note} onChange={e => setFormDocumento(p => ({ ...p, note: e.target.value }))} placeholder="Es. documento leggibile, merce conforme, nessuna anomalia..." />
                </label>

                <button className="primary full" type="submit">
                  <Camera size={18} /> Salva documento e registra controllo
                </button>
              </form>

              {uploadStatus && <p className="uploadStatus">{uploadStatus}</p>}
            </section>

            <section className="panel">
              <h3>Archivio documenti</h3>
              <div className="docsGrid">
                {dati.documenti.length === 0 && <div className="emptyBox">Nessun documento caricato</div>}
                {dati.documenti.map(d => (
                  <div className="docCard" key={d.id}>
                    {d.fileType?.startsWith("image/") ? (
                    <img className="docThumb" src={d.url} alt={d.tipo} />
                  ) : (
                    <div className="docIcon"><Image size={22} /></div>
                  )}
                    <div>
                      <strong>{d.tipo}</strong>
                      <span>{d.fornitore || "Senza fornitore"} — {d.numero || "senza numero"}</span>
                      <small>{d.dataDocumento} · {d.controllo}</small>
                    </div>
                    <a href={d.url} target="_blank" rel="noreferrer">Apri</a>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {tab === "stampe" && (
          <>
            <Header titolo="Stampe mensili" sottotitolo="Genera registri mensili per timbro e firma" />

            <section className="panel">
              <div className="formGrid">
                <label>
                  Registro
                  <select value={stampa.tipo} onChange={e => setStampa(p => ({ ...p, tipo: e.target.value }))}>
                    <option value="temperature">Temperature</option>
                    <option value="pulizie">Pulizie</option>
                  </select>
                </label>

                <label>
                  Mese
                  <select value={stampa.mese} onChange={e => setStampa(p => ({ ...p, mese: e.target.value }))}>
                    <option value="1">Gennaio</option>
                    <option value="2">Febbraio</option>
                    <option value="3">Marzo</option>
                    <option value="4">Aprile</option>
                    <option value="5">Maggio</option>
                    <option value="6">Giugno</option>
                    <option value="7">Luglio</option>
                    <option value="8">Agosto</option>
                    <option value="9">Settembre</option>
                    <option value="10">Ottobre</option>
                    <option value="11">Novembre</option>
                    <option value="12">Dicembre</option>
                  </select>
                </label>

                <label>
                  Anno
                  <input value={stampa.anno} onChange={e => setStampa(p => ({ ...p, anno: e.target.value }))} />
                </label>

                <div className="printActions full">
                  <button className="secondary" type="button" onClick={completaAutomaticheMese}>
                    <Database size={18} /> Completa automatiche mese
                  </button>
                  <button className="primary" type="button" onClick={stampaMensile}>
                    <Printer size={18} /> Stampa registro mensile
                  </button>
                </div>
              </div>
            </section>

            <section className="panel">
              <h3>Anteprima righe da stampare</h3>
              <DataTable
                columns={["Data", "Voce", "Dettaglio", "Esito", "Operatore"]}
                rows={righePreviewStampa.map(r => [
                  r.data,
                  r.voce,
                  r.dettaglio,
                  <Badge tipo={r.esito === "ANOMALIA" ? "danger" : "ok"}>{r.esito}</Badge>,
                  r.operatore
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
        Sistema attivo
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
          <option>Sistema automatico</option>
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

function moduloDaTipoDocumento(tipo) {
  if (tipo.includes("FIR")) return "oli";
  if (tipo.includes("Attestato")) return "formazione";
  if (tipo.includes("Rapporto")) return "manutenzioni";
  if (tipo.includes("disinfestazione")) return "infestanti";
  return "merci";
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

function generaHtmlStampa(titolo, azienda, righe, mese, anno) {
  const rows = righe.map(r => `
    <tr>
      <td>${formatDataIt(r.data)}</td>
      <td>${escapeHtml(r.voce)}</td>
      <td>${escapeHtml(r.dettaglio || "")}</td>
      <td>${escapeHtml(r.esito || "")}</td>
      <td>${escapeHtml(r.operatore || "")}</td>
    </tr>
  `).join("");

  return `
    <!doctype html>
    <html>
      <head>
        <title>${titolo}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: Arial, sans-serif; color: #111; }
          h1 { margin: 0; font-size: 22px; }
          h2 { margin: 4px 0 12px; font-size: 16px; }
          .head { border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 12px; }
          .info { font-size: 12px; margin-top: 6px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #111; padding: 6px; text-align: left; }
          th { background: #eee; }
          .firma { margin-top: 30px; display: flex; justify-content: space-between; gap: 30px; }
          .box { width: 48%; border-top: 1px solid #111; padding-top: 8px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="head">
          <h1>${escapeHtml(azienda.nome || "Azienda")}</h1>
          <h2>${escapeHtml(titolo)} - ${mese}/${anno}</h2>
          <div class="info">
            P.IVA: ${escapeHtml(azienda.piva || "-")} |
            Sede: ${escapeHtml(azienda.sede || "-")} |
            Responsabile HACCP: ${escapeHtml(azienda.responsabile || "-")}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Voce</th>
              <th>Dettaglio</th>
              <th>Esito</th>
              <th>Operatore</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="firma">
          <div class="box">Firma responsabile HACCP</div>
          <div class="box">Timbro azienda</div>
        </div>
      </body>
    </html>
  `;
}

function formatDataIt(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d)) return v;
  return d.toLocaleDateString("it-IT");
}

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
