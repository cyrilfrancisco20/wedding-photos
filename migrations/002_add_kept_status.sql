-- À exécuter dans Supabase > SQL Editor AVANT que le bouton « À conserver » ne serve.
-- Ajoute le statut 'kept' (dossier « Conneries » du modérateur) : photo gardée en
-- base, jamais projetée ni affichée dans la galerie publique, visible seulement
-- dans l'espace modérateur. Sans cette migration, la contrainte photos_status_check
-- rejette l'insert/update et le bouton renvoie une erreur.

alter table public.photos drop constraint if exists photos_status_check;
alter table public.photos add constraint photos_status_check
  check (status in ('approved', 'rejected', 'pending', 'kept'));
