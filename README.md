# Daily LINGO • Il Gioco Quotidiano delle Parole Italiane

Un sito web minimale, moderno e reattivo ispirato a Wordle e Lingo, pensato specificamente per la lingua italiana.

## Caratteristiche Principali

- **Meccanica di Sfida Asimmetrica (Social / Viral Loop)**:
  - Genera link di sfida personalizzati con una parola segreta a scelta (5, 6 o 7 lettere) e il tuo nickname.
  - Cifratura URL-safe invisibile (la parola non è leggibile nella barra degli indirizzi).
  - Condivisione 1-click su **WhatsApp** e **Telegram** con messaggi d'ingaggio virali precompilati.
  - Chi riceve il link gioca immediatamente senza login, vede chi lo ha sfidato e, a fine partita, scopre se ha battuto il record con un pulsante dedicato per **lanciare una contro-sfida immediata**.
- **3 Livelli di Difficoltà Quotidiani**:
  - **5 Lettere** (6 tentativi)
  - **6 Lettere** (6 tentativi)
  - **7 Lettere** (6 tentativi)
  Ogni giorno a mezzanotte viene generata automaticamente una nuova parola segreta per ciascuna difficoltà, sincronizzata con la data del calendario.
- **Dizionario Italiano Autentico**: Oltre **3.200 parole reali**, verificate e prive di troncamenti o parole arcaiche.
- **Codice Colore Ufficiale**:
  - 🟩 **Verde**: Lettera corretta al posto giusto.
  - 🟨 **Giallo**: Lettera presente nella parola ma in un'altra posizione (con gestione rigorosa dei duplicati).
  - ⬛ **Grigio**: Lettera non presente nella parola.
- **Tastiera QWERTY Interattiva**:
  - Disposta in basso (QWERTY standard con tasti `INVIO` e `⌫`).
  - Tiene traccia dello stato di tutte le lettere utilizzate aggiornando dinamicamente i colori.
  - Pieno supporto per input da **tastiera fisica**, inclusa la conversione automatica dei caratteri accentati (`à`, `è`, `é`, `ì`, `ò`, `ù`).
- **Design Minimale & Moderno**:
  - Palette scura elegante di default, con toggle per il tema chiaro.
  - Animazioni fluide di rotazione 3D (flip), pop sui caratteri e rimbalzo festoso in caso di vittoria.
  - Effetto coriandoli celebrativo.
- **Effetti Sonori (Web Audio API)**: Sintetizzati direttamente nel browser senza file esterni (disattivabili con un clic).
- **Statistiche & Condivisione**:
  - Tracciamento locale delle partite giocate, percentuale di vittorie, serie attuale (streak) e serie migliore.
  - Grafico della distribuzione dei tentativi.
  - Tasto **"Condividi Risultato"** che copia negli appunti la griglia emoji (compatibile con WhatsApp, Telegram, social).
  - Modalità **"Allenamento Libero"** per continuare a giocare parole casuali una volta completato il puzzle del giorno.

---

## Come Avviare il Gioco

Poiché il progetto è realizzato in standard web nativi (HTML5, CSS3, JavaScript ES6), non richiede alcuna installazione o dipendenza esterna:

1. Fai doppio clic su `index.html` per aprirlo direttamente in qualsiasi browser (Safari, Chrome, Firefox, Edge, Brave).
2. Oppure, da terminale, puoi avviare un server locale:
   ```bash
   cd /Users/davideciaccia/.gemini/antigravity/scratch/limbo-game
   python3 -m http.server 8080
   # oppure
   npx serve .
   ```
   E apri `http://localhost:8080` nel browser.
