-- ============================================================
-- SPOJENÁ ŠKOLA SEČOVCE – ŠKOLSKÝ CLOUD
-- Tento SQL skopíruj a spusti v Supabase SQL Editore
-- ============================================================

-- 1. TABUĽKA PROFILOV
-- ============================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  class TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABUĽKA PRIEČINKOV
-- ============================================================
CREATE TABLE folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABUĽKA SÚBOROV
-- ============================================================
CREATE TABLE files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  class TEXT NOT NULL,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  description TEXT,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. POVOLENIE RLS (Row Level Security)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- 5. POLICIES PRE PROFILES
-- ============================================================

-- Každý vidí len vlastný profil
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Admin vidí všetky profily
CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admin môže meniť profily (schvaľovanie)
CREATE POLICY "Admin can update profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admin môže vymazávať profily
CREATE POLICY "Admin can delete profiles"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Nový používateľ môže vložiť vlastný profil
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 6. POLICIES PRE FOLDERS
-- ============================================================

-- Žiak vidí priečinky svojej triedy
CREATE POLICY "Students view class folders"
  ON folders FOR SELECT
  USING (
    class = (
      SELECT class FROM profiles WHERE id = auth.uid() AND status = 'approved'
    )
  );

-- Admin vidí všetky priečinky
CREATE POLICY "Admin view all folders"
  ON folders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Schválený žiak môže vytvoriť priečinok vo vlastnej triede
CREATE POLICY "Approved students can create folders"
  ON folders FOR INSERT
  WITH CHECK (
    class = (
      SELECT class FROM profiles WHERE id = auth.uid() AND status = 'approved'
    )
    AND created_by = auth.uid()
  );

-- Admin môže vytvárať priečinky v ľubovolnej triede
CREATE POLICY "Admins can create folders"
  ON folders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
    AND created_by = auth.uid()
  );

-- Žiak môže vymazať vlastný priečinok
CREATE POLICY "Students delete own folders"
  ON folders FOR DELETE
  USING (created_by = auth.uid());

-- Admin môže vymazať akýkoľvek priečinok
CREATE POLICY "Admin delete any folder"
  ON folders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 7. POLICIES PRE FILES
-- ============================================================

-- Žiak vidí súbory svojej triedy
CREATE POLICY "Students view class files"
  ON files FOR SELECT
  USING (
    class = (
      SELECT class FROM profiles WHERE id = auth.uid() AND status = 'approved'
    )
  );

-- Admin vidí všetky súbory
CREATE POLICY "Admin view all files"
  ON files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Schválený žiak môže nahrávať do vlastnej triedy
CREATE POLICY "Approved students can upload"
  ON files FOR INSERT
  WITH CHECK (
    class = (
      SELECT class FROM profiles WHERE id = auth.uid() AND status = 'approved'
    )
    AND uploaded_by = auth.uid()
  );

-- Žiak môže vymazať vlastný súbor
CREATE POLICY "Students delete own files"
  ON files FOR DELETE
  USING (uploaded_by = auth.uid());

-- Admin môže vymazať akýkoľvek súbor
CREATE POLICY "Admin delete any file"
  ON files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 8. STORAGE BUCKET
-- ============================================================
-- Toto vytvor manuálne v Supabase:
-- Storage > New Bucket > Názov: "class-files" > Public: ÁNO

-- Potom spusti tieto policies pre storage:
INSERT INTO storage.buckets (id, name, public) VALUES ('class-files', 'class-files', true);

-- Žiak uploaduje len do priečinka svojej triedy (len povolené typy súboru)
CREATE POLICY "Students upload to own class folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'class-files'
    AND (storage.foldername(name))[1] = (
      SELECT class FROM profiles WHERE id = auth.uid() AND status = 'approved'
    )
    AND lower(storage.extension(name)) IN (
      'pdf', 'jpg', 'jpeg', 'png', 'webp', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx'
    )
  );

-- Admin môže nahrávať súbory do ľubovolnéj triedy
CREATE POLICY "Admin upload to any class folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'class-files'
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
    AND lower(storage.extension(name)) IN (
      'pdf', 'jpg', 'jpeg', 'png', 'webp', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx'
    )
  );

-- Verejný prístup na čítanie (ak je bucket public)
CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'class-files');

-- Admin a vlastník môžu vymazávať
CREATE POLICY "Owner and admin can delete files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'class-files'
    AND (
      auth.uid()::text = (storage.foldername(name))[2]
      OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
      )
    )
  );

-- 9. VYTVOR ADMINA
-- ============================================================
-- Po registrácii tvojho účtu spusti (nahraď EMAIL a USER_ID z auth.users):
-- UPDATE profiles SET is_admin = true, status = 'approved' WHERE email = 'tvoj@email.com';

-- Alebo cez UUID (nájdeš v Authentication > Users v Supabase):
-- UPDATE profiles SET is_admin = true, status = 'approved' WHERE id = 'uuid-tvojho-uctu';


-- ============================================================
-- MIGRÁCIA — spusti ak databáza už existuje (produkcia)
-- ============================================================
-- Ak už máš existujúcu databázu bez priečinkov, spusti toto:

-- 1. Vytvor tabuľku folders (ak ešte neexistuje)
CREATE TABLE IF NOT EXISTS folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Pridaj folder_id do existujúcej tabuľky files (ak ešte neexistuje)
ALTER TABLE files ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

-- 3. Zapni RLS pre folders
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- 4. Pridaj policies pre folders (ak ešte neexistujú)
DO $ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'folders' AND policyname = 'Students view class folders'
  ) THEN
    CREATE POLICY "Students view class folders"
      ON folders FOR SELECT
      USING (
        class = (
          SELECT class FROM profiles WHERE id = auth.uid() AND status = 'approved'
        )
      );
  END IF;
END $;

DO $ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'folders' AND policyname = 'Admin view all folders'
  ) THEN
    CREATE POLICY "Admin view all folders"
      ON folders FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
        )
      );
  END IF;
END $;

DO $ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'folders' AND policyname = 'Approved students can create folders'
  ) THEN
    CREATE POLICY "Approved students can create folders"
      ON folders FOR INSERT
      WITH CHECK (
        class = (
          SELECT class FROM profiles WHERE id = auth.uid() AND status = 'approved'
        )
        AND created_by = auth.uid()
      );
  END IF;
END $;

DO $ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'folders' AND policyname = 'Admins can create folders'
  ) THEN
    CREATE POLICY "Admins can create folders"
      ON folders FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
        )
        AND created_by = auth.uid()
      );
  END IF;
END $;

DO $ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'folders' AND policyname = 'Students delete own folders'
  ) THEN
    CREATE POLICY "Students delete own folders"
      ON folders FOR DELETE
      USING (created_by = auth.uid());
  END IF;
END $;

DO $ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'folders' AND policyname = 'Admin delete any folder'
  ) THEN
    CREATE POLICY "Admin delete any folder"
      ON folders FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
        )
      );
  END IF;
END $;

-- ============================================================
-- MIGRÁCIA — storage policies (webp + admin upload)
-- Spusti v Supabase SQL Editore ak máš existujúcu produkciu
-- ============================================================

-- 1. Aktualizuj policies súborů v storage (DROP + CREATE)
DROP POLICY IF EXISTS "Students upload to own class folder" ON storage.objects;
CREATE POLICY "Students upload to own class folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'class-files'
    AND (storage.foldername(name))[1] = (
      SELECT class FROM profiles WHERE id = auth.uid() AND status = 'approved'
    )
    AND lower(storage.extension(name)) IN (
      'pdf', 'jpg', 'jpeg', 'png', 'webp', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx'
    )
  );

-- 2. Pridaj admin upload policy (ak ešte neexistuje)
DROP POLICY IF EXISTS "Admin upload to any class folder" ON storage.objects;
CREATE POLICY "Admin upload to any class folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'class-files'
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
    AND lower(storage.extension(name)) IN (
      'pdf', 'jpg', 'jpeg', 'png', 'webp', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx'
    )
  );
