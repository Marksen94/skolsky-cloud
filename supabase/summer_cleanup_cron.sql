-- ============================================================
-- MIGRÁCIA: Automatické mazanie súborov každý rok 1. septembra
-- Spusti v Supabase SQL Editore (Dashboard → SQL Editor)
-- ============================================================

-- 1. Aktivuj pg_cron a pg_net rozšírenia (iba raz, ak ešte nie sú)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Zmaž starý job ak existuje (bezpečný re-run)
SELECT cron.unschedule('summer-cleanup')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'summer-cleanup'
);

-- 3. Naplánuj Edge Function na 1. septembra každý rok o 02:00 UTC
--    Syntax: minúta  hodina  deň  mesiac  deň_týždňa
SELECT cron.schedule(
  'summer-cleanup',         -- názov jobu
  '0 2 1 9 *',              -- každý rok 1.9. o 02:00 UTC
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/summer-cleanup',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.cleanup_secret')
      ),
      body    := '{}'::jsonb
    );
  $$
);

-- 4. Ulož potrebné nastavenia (nahraď hodnoty svojimi)
-- !! Spusti toto OSOBITNE po nastavení skutočných hodnôt !!
--
--   ALTER DATABASE postgres
--     SET app.supabase_url = 'https://TVOJ-PROJECT-ID.supabase.co';
--
--   ALTER DATABASE postgres
--     SET app.cleanup_secret = 'TVOJ-TAJNY-TOKEN-MIN-32-ZNAKOV';
--
-- Rovnaký CLEANUP_SECRET nastav aj v:
--   Supabase Dashboard → Edge Functions → summer-cleanup → Secrets
--   Kľúč:   CLEANUP_SECRET
--   Hodnota: (rovnaký tajný token ako vyššie)

-- ============================================================
-- OVERENIE — skontroluj naplánovaný job
-- ============================================================
-- SELECT * FROM cron.job WHERE jobname = 'summer-cleanup';

-- ============================================================
-- MANUÁLNY TEST (voliteľné) — spusti ihneď pre overenie
-- ============================================================
-- SELECT net.http_post(
--   url     := 'https://TVOJ-PROJECT-ID.supabase.co/functions/v1/summer-cleanup',
--   headers := jsonb_build_object(
--     'Content-Type',  'application/json',
--     'Authorization', 'Bearer TVOJ-TAJNY-TOKEN'
--   ),
--   body    := '{}'::jsonb
-- );
