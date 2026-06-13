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
  original_name TEXT NOT NULL CHECK (char_length(original_name) <= 255),
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  description TEXT,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABUĽKA OZNAMOV
-- ============================================================
CREATE TABLE announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  message TEXT NOT NULL,
  class TEXT NOT NULL,
  color TEXT DEFAULT 'blue',
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. POVOLENIE RLS (Row Level Security)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 6. POLICIES PRE PROFILES
-- ============================================================

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admin can update profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admin can delete profiles"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 7. POLICIES PRE FOLDERS
-- ============================================================

CREATE POLICY "Students view class folders"
  ON folders FOR SELECT
  USING (
    class = (
      SELECT class FROM profiles WHERE id = auth.uid() AND status = 'approved'
    )
  );

CREATE POLICY "Admin view all folders"
  ON folders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Approved students can create folders"
  ON folders FOR INSERT
  WITH CHECK (
    class = (
      SELECT class FROM profiles WHERE id = auth.uid() AND status = 'approved'
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Admins can create folders"
  ON folders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Students delete own folders"
  ON folders FOR DELETE
  USING (created_by = auth.uid());

CREATE POLICY "Admin delete any folder"
  ON folders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Students update own folders"
  ON folders FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admin update any folder"
  ON folders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 8. POLICIES PRE FILES
-- ============================================================

CREATE POLICY "Students view class files"
  ON files FOR SELECT
  USING (
    class = (
      SELECT class FROM profiles WHERE id = auth.uid() AND status = 'approved'
    )
  );

CREATE POLICY "Admin view all files"
  ON files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Approved students can upload"
  ON files FOR INSERT
  WITH CHECK (
    class = (
      SELECT class FROM profiles WHERE id = auth.uid() AND status = 'approved'
    )
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "Students delete own files"
  ON files FOR DELETE
  USING (uploaded_by = auth.uid());

CREATE POLICY "Admin delete any file"
  ON files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Students update own files"
  ON files FOR UPDATE
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Admin update any file"
  ON files FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 9. POLICIES PRE ANNOUNCEMENTS
-- ============================================================

-- Žiak číta len aktívne oznamy svojej triedy
CREATE POLICY "Students read own class announcements"
  ON announcements FOR SELECT
  USING (
    active = true AND
    class = (SELECT class FROM profiles WHERE id = auth.uid() AND status = 'approved')
  );

-- Admin má plný prístup
CREATE POLICY "Admin full access announcements"
  ON announcements FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- 10. STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('class-files', 'class-files', false);

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

-- Autentifikovaný prístup — žiak číta len súbory svojej triedy
CREATE POLICY "Authenticated students read own class"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'class-files'
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[1] = (
        SELECT class FROM profiles WHERE id = auth.uid() AND status = 'approved'
      )
      OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
      )
    )
  );

-- Admin a vlastník môžu vymazávať
CREATE POLICY "Owner and admin can delete files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'class-files'
    AND (
      owner = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
      )
    )
  );

-- 11. VYTVOR ADMINA
-- ============================================================
-- UPDATE profiles SET is_admin = true, status = 'approved' WHERE email = 'tvoj@email.com';


-- ============================================================
-- MIGRÁCIA — spusti ak databáza už existuje (produkcia)
-- ============================================================

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

-- 2b. Pridaj deletion_requested flag do profiles (ak ešte neexistuje)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deletion_requested BOOLEAN DEFAULT false;

-- 2c. Pridaj CHECK constraint na original_name (ak ešte neexistuje)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'files_original_name_length'
  ) THEN
    ALTER TABLE files ADD CONSTRAINT files_original_name_length CHECK (char_length(original_name) <= 255);
  END IF;
END $$;

-- 2d. Vytvor tabuľku announcements (ak ešte neexistuje)
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  message TEXT NOT NULL,
  class TEXT NOT NULL,
  color TEXT DEFAULT 'blue',
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'Students read own class announcements') THEN
    CREATE POLICY "Students read own class announcements"
      ON announcements FOR SELECT
      USING (
        active = true AND
        class = (SELECT class FROM profiles WHERE id = auth.uid() AND status = 'approved')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND policyname = 'Admin full access announcements') THEN
    CREATE POLICY "Admin full access announcements"
      ON announcements FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
      WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
  END IF;
END $$;

-- 3. Zapni RLS pre folders
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- 4. Pridaj policies pre folders (ak ešte neexistujú)
DO $$ BEGIN
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
END $$;

DO $$ BEGIN
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
END $$;

DO $$ BEGIN
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
END $$;

DO $$ BEGIN
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
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'folders' AND policyname = 'Students delete own folders'
  ) THEN
    CREATE POLICY "Students delete own folders"
      ON folders FOR DELETE
      USING (created_by = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'folders' AND policyname = 'Students update own folders'
  ) THEN
    CREATE POLICY "Students update own folders"
      ON folders FOR UPDATE
      USING (created_by = auth.uid())
      WITH CHECK (created_by = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'folders' AND policyname = 'Admin update any folder'
  ) THEN
    CREATE POLICY "Admin update any folder"
      ON folders FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
        )
      );
  END IF;
END $$;

DO $$ BEGIN
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
END $$;

-- ============================================================
-- MIGRÁCIA — Rate limiting + XSS ochrana na úrovni DB
-- ============================================================

DROP POLICY IF EXISTS "Approved students can upload" ON files;

CREATE POLICY "Approved students can upload (rate limited)"
  ON files FOR INSERT
  WITH CHECK (
    class = (
      SELECT class FROM profiles WHERE id = auth.uid() AND status = 'approved'
    )
    AND uploaded_by = auth.uid()
    AND (
      SELECT COUNT(*) FROM files
      WHERE uploaded_by = auth.uid()
        AND created_at >= NOW() - INTERVAL '1 day'
    ) < 20
  );

ALTER TABLE files DROP CONSTRAINT IF EXISTS description_safe;
ALTER TABLE files ADD CONSTRAINT description_safe CHECK (
  description IS NULL OR (
    length(description) <= 300
    AND description NOT LIKE '%<%'
    AND description NOT LIKE '%>%'
  )
);

-- ============================================================

UPDATE storage.buckets SET public = false WHERE id = 'class-files';

DROP POLICY IF EXISTS "Public read access" ON storage.objects;

CREATE POLICY "Authenticated students read own class"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'class-files'
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[1] = (
        SELECT class FROM profiles WHERE id = auth.uid() AND status = 'approved'
      )
      OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
      )
    )
  );

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

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'files' AND policyname = 'Students update own files'
  ) THEN
    CREATE POLICY "Students update own files"
      ON files FOR UPDATE
      USING (uploaded_by = auth.uid())
      WITH CHECK (uploaded_by = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'files' AND policyname = 'Admin update any file'
  ) THEN
    CREATE POLICY "Admin update any file"
      ON files FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
        )
      );
  END IF;
END $$;
