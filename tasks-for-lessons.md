# Leçons — wedding-photos

Format : RÈGLE / POURQUOI / FAIRE / NE PAS FAIRE

## 2026-06-29 — Périmètre d'un prompt de modération IA
- RÈGLE : un modérateur IA ne bloque QUE les catégories nuisibles explicitement définies (sexuel, violence, haine, drogue). Le hors-sujet, la qualité ou la pertinence ne sont JAMAIS des motifs de rejet.
- POURQUOI : le prompt initial laissait Claude rejeter une capture d'écran Gmail au motif « ce n'est pas une photo de mariage ». Une photo banale d'invité aurait pu être bloquée de la même façon → perte de vrais souvenirs. Cyril l'a vu via « la photo n'apparaît pas en diffusion ».
- FAIRE : énumérer explicitement les seuls motifs de blocage ; ajouter « approuve tout le reste, y compris hors-sujet/flou/banal » ; en cas de doute → `pending` (revue humaine), jamais `reject` par excès.
- NE PAS FAIRE : laisser le modèle juger la pertinence ou la qualité ; rejeter une image inoffensive.

## 2026-06-29 — iOS strippe la date EXIF à l'upload web
- RÈGLE : ne pas bâtir une fonctionnalité sur une donnée d'entrée (ici EXIF `DateTimeOriginal`) sans avoir vérifié qu'elle survit au transport réel. iOS retire date + GPS quand on envoie une photo de l'album via le navigateur ; les tags techniques restent.
- POURQUOI : tout le tri par moment reposait sur l'heure de prise de vue. Test physique iPhone → fichier sans `DateTimeOriginal` (vérifié en téléchargeant le fichier réel et en l'inspectant, pas en supposant). Le tri 100% auto était mort pour la majorité des invités.
- FAIRE : tester la donnée sur le vrai device avant de finaliser ; prévoir un repli humain dès la conception (sélecteur de moment pré-rempli sur l'horloge) ; garder l'EXIF en priorité quand il survit (Android/desktop).
- NE PAS FAIRE : croire que la lecture EXIF côté navigateur récupère ce qu'iOS a retiré (le strip est au niveau OS, le fichier arrive déjà sans date) ; conclure « EXIF absent » sans avoir inspecté le fichier réel (ç'aurait pu être un bug exifr).

## 2026-06-29 — Une feature déclenchée par le temps a besoin d'un override pour être testée
- RÈGLE : si une fonctionnalité ne s'active qu'à une date/heure précise (ici la projection qui ne montre que le moment courant), prévoir dès la conception un moyen de la forcer (ex. `/projection?moment=aperitif`) pour la voir marcher avant le déclencheur.
- POURQUOI : Cyril a cru à un bug (« ma photo n'apparaît pas en projection ») alors que c'était normal (hors dates du mariage = veille). Sans override, impossible de prouver visuellement que ça marchera le jour J ; « fais-moi confiance » ne suffit pas.
- FAIRE : ajouter un paramètre de forçage/preview ; il sert double : test avant + secours opérationnel le jour J si l'horaire dérape.
- NE PAS FAIRE : livrer une feature time-gated sans aucun moyen de la déclencher manuellement pour la démo/le test.

## 2026-06-29 — Hygiène d'environnement de test (preview vs prod)
- RÈGLE : un environnement de test doit refléter la config de prod, sinon il génère des faux signaux. La preview Vercel partageait la base Supabase de prod MAIS n'avait pas `ANTHROPIC_API_KEY` → toutes les photos en `pending` (modération en échec) et confusion sur quelle URL avait reçu l'upload.
- POURQUOI : plusieurs allers-retours perdus à diagnostiquer des `pending` qui n'étaient qu'un manque de clé sur la preview, et à démêler preview/prod qui écrivent dans la même base.
- FAIRE : soit tester directement sur la cible, soit donner à la preview les mêmes env vars ; toujours identifier par quelle URL/déploiement passe la donnée (le `moment=null` vs `a-classer` a servi de marqueur pour distinguer ancien code/prod de nouveau code/preview).
- NE PAS FAIRE : interpréter un échec de preview comme un problème de prod ; supposer que preview et prod ont la même config.
