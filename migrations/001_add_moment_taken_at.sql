-- À exécuter dans Supabase > SQL Editor avant de déployer.
-- Ajoute la date de prise de vue (EXIF) et le dossier de moment calculé.

alter table public.photos
  add column if not exists taken_at timestamptz,
  add column if not exists moment text;

-- Les photos existantes n'ont pas de date de prise de vue connue : à classer.
update public.photos set moment = 'a-classer' where moment is null;

-- Accélère le filtrage de la projection par moment.
create index if not exists photos_moment_idx on public.photos (moment);
