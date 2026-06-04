# 🏫 Školský Cloud – Spojená škola Sečovce

Webová aplikácia pre zdieľanie poznámok, fotených písomiek a prezentácií medzi žiakmi.

---

## 📋 Čo obsahuje

- **Prihlásenie / Registrácia** so schválením správcom
- **Triedny cloud** – žiaci vidia len súbory svojej triedy
- **Nahrávanie súborov** (PDF, obrázky, PPT, Word, Excel – max 30 MB)
- **Admin panel** – schvaľovanie žiakov, správa súborov
- **Triedy:** 1A, 1C, 1T, 1G, 2A, 2C, 2T, 2G, 3A, 3C, 3T, 3G, 4A, 4C, 4T, 4G

---

## 🚀 KOMPLETNÝ NÁVOD NA SPUSTENIE

### KROK 1 – Nainštaluj potrebné nástroje

1. **Node.js** → https://nodejs.org (stiahni LTS verziu)
2. **Git** → https://git-scm.com
3. **(Odporúčané) VS Code** → https://code.visualstudio.com

Po inštalácii otvor terminál (CMD alebo PowerShell) a over:
```
node -v
git -v
```

---

### KROK 2 – Vytvor Supabase projekt (databáza + súborový systém)

1. Choď na https://supabase.com a zaregistruj sa (zadarmo)
2. Klikni **"New Project"**
   - Názov: `skolsky-cloud`
   - Heslo databázy: ulož si ho bezpečne
   - Region: `eu-central-1` (Frankfurt – najbližší)
3. Počkaj ~2 minúty kým sa projekt vytvorí

**Zber si API kľúče:**
- Choď do: **Project Settings → API**
- Skopíruj:
  - `Project URL` → napr. `https://abc123.supabase.co`
  - `anon public` key → dlhý text začínajúci `eyJ...`

---

### KROK 3 – Nastav databázu (SQL)

1. V Supabase klikni na **SQL Editor** (v ľavom menu)
2. Klikni **"New Query"**
3. Otvor súbor `supabase_setup.sql` z tohto projektu
4. Skopíruj celý obsah a vlož do SQL Editora
5. Klikni **"Run"**

Ak nejaký príkaz zlyhá, skús ich spustiť postupne po blokoch.

---

### KROK 4 – Nastav Storage bucket

1. V Supabase klikni **Storage** (ľavé menu)
2. Klikni **"New Bucket"**
   - Názov: `class-files`
   - Zaškrtni **Public bucket** (áno)
3. Klikni **Create**

---

### KROK 5 – Nastav projekt na počítači

Otvor terminál, choď do priečinka kde chceš mať projekt a spusti:

```bash
# Skopíruj konfiguráciu
cp .env.local.example .env.local
```

Otvor `.env.local` v textovom editore a vyplň:
```
NEXT_PUBLIC_SUPABASE_URL=https://tvoje-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...tvoj-anon-key...
NEXT_PUBLIC_ADMIN_EMAIL=tvoj@email.com
```

Potom nainštaluj balíčky:
```bash
npm install
```

---

### KROK 6 – Spusti aplikáciu lokálne

```bash
npm run dev
```

Otvor prehliadač: **http://localhost:3000**

---

### KROK 7 – Vytvor admin účet

1. Choď na `http://localhost:3000/register`
2. Zaregistruj sa tvojím emailom (napr. email správcu)
3. V Supabase choď na **SQL Editor** a spusti:

```sql
UPDATE profiles 
SET is_admin = true, status = 'approved' 
WHERE email = 'tvoj@email.com';
```

Teraz sa môžeš prihlásiť a budeš mať prístup na admin panel.

---

### KROK 8 – Nasadenie na internet (Vercel)

1. Nahraj kód na GitHub:
   ```bash
   git init
   git add .
   git commit -m "first commit"
   git branch -M main
   git remote add origin https://github.com/TVOJE-MENO/skolsky-cloud.git
   git push -u origin main
   ```

2. Choď na https://vercel.com a zaregistruj sa (cez GitHub)

3. Klikni **"New Project"** → Vyber tvoj GitHub repozitár

4. Pred deployom nastav **Environment Variables:**
   - `NEXT_PUBLIC_SUPABASE_URL` = tvoja URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = tvoj kľúč
   - `NEXT_PUBLIC_ADMIN_EMAIL` = tvoj email

5. Klikni **Deploy** → o ~2 minúty budeš mať webstránku online!

---

## 🔧 Každodenné používanie

### Schvaľovanie žiakov
1. Žiak sa zaregistruje → dostaneš správu alebo si pozrieš admin panel
2. Prihlás sa → **Admin panel** → záložka **"Žiadosti"**
3. Klikni **Schváliť** pri žiakovi

### Žiaci
1. Zaregistrujú sa na stránke
2. Napíšu ti (Instagram / email) aby si schválil ich účet
3. Po schválení sa prihlásia a vidia súbory svojej triedy
4. Môžu nahrávať aj sťahovať súbory

---

## 📁 Štruktúra projektu

```
school-cloud/
├── src/
│   ├── app/
│   │   ├── page.js          → Prihlásenie
│   │   ├── register/        → Registrácia
│   │   ├── dashboard/       → Žiacky panel
│   │   └── admin/           → Admin panel
│   ├── lib/
│   │   └── supabase.js      → Konfigurácia
│   └── globals.css          → Dizajn
├── supabase_setup.sql        → SQL pre databázu
├── .env.local.example        → Vzor pre premenné
└── package.json
```

---

## ❓ Časté problémy

**"Invalid API key"** → Skontroluj `.env.local`, URL a kľúč musia byť správne

**"Row Level Security"** → Spusti celý `supabase_setup.sql` znova

**Žiak sa nemôže prihlásiť** → Skontroluj či je v databáze status = 'approved'

**Súbor sa nenahrá** → Skontroluj či storage bucket `class-files` existuje a je Public

---

## 🛡️ Bezpečnosť

- Každá trieda vidí len vlastné súbory (Row Level Security na úrovni databázy)
- Žiaci môžu nahrávať len do priečinka svojej triedy
- Admin môže vidieť a spravovať všetko
- Žiaci nemôžu vymazávať súbory iných

---

*Vytvorené pre Spojenú školu Sečovce*
