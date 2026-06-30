# Primer — wedding-photos (appli photos du mariage, 11/07/2026)

## ⤷ POUSSÉ + DÉPLOYÉ EN PROD (30/06/2026)
Les 2 chantiers ci-dessous (retouches design + compression/dossiers) ont été mergés dans `main` (sommet `6339b3c`) et auto-déployés par Vercel. Vérifié en prod : bundle CSS contient le bloc `.gal-a` terra (#c77b5e) → galerie Variante A live ; `/apercu` = 404 ; `/accueil/hero.png`+g1-g3 = 200 (héro OK) ; ancien `/maquette/` = 404. Reste à prouver par un vrai upload (compression+dossier) : non testé sur prod pour ne pas polluer (validé en local E2E). **Vider la base avant le 11/07** après tes tests.

## RETOUCHES DESIGN (30/06/2026) — FAIT + déployé (commit e020f5c)
Reprise après la session « General coding » surchargée. Le refactor « par jour » était déjà mergé+poussé dans `main` (commit `001f78c`, donc déjà auto-déployé en prod, contrairement à ce que disait l'ancienne section « EN ATTENTE GO PUSH » ci-dessous, désormais périmée). Prod actuelle = par jour fonctionnel mais galerie encore en or + modérateur ancienne charte.
Les 4 retouches demandées, traitées en pur habillage (aucune logique touchée) :
1. **Galerie → Variante A claire** : override CSS **scopé** `.gal-a` sur le `<main>` (+ lightbox) dans `globals.css`. Redéfinit localement les tokens (`--or`→terra #C77B5E, `--nuit`→encre #4A3A30, `--ivoire`→#F7F2E9, etc.) alignés sur l'accueil, SANS toucher la projection (qui partage les noms de tokens mais reste sombre/or). Lightbox réchauffée (fond ink, hairlines ivoire). Vérifié : cover + onglets + timeline + nœuds en terra, zéro or.
2. **Modérateur rhabillé** : charte claire (ivory/terra/Cormorant), icônes SVG inline à la place des emoji (cadenas/check/croix/refresh). Logique (login, loadPhotos, moderate, reassign) intacte. Connexion vérifiée visuellement ; vue interne non vue (pas le `MODERATOR_PASSWORD`) mais même palette/composants que l'accueil déjà validé.
3. **g4/g5 ÉCARTÉ** (à raison) : ces 2 placeholders ne vivaient que dans `/apercu` (maquette jetable). La vraie galerie affiche les photos uploadées (Supabase), aucune image statique. Les remplacer = travail perdu. Validé avec Cyril.
4. **Nettoyage** : `/apercu` supprimé, `public/maquette/` supprimé. Vraies images (hero.png + g1/g2/g3) déplacées vers **`public/accueil/`**, refs accueil mises à jour. CSS `.mq-wipe` orphelin retiré, `.mq-zoom` conservé (héro accueil l'utilise).
- **Preuves** : `tsc --noEmit` clean ; lint = baseline inchangée (6 err préexistantes set-state-in-effect/img/apostrophe, 0 ajoutée) ; rendu mobile vérifié sur les 4 surfaces (galerie+accueil+modérateur clairs Variante A, projection sombre/or intacte), 0 erreur console.
- **PROCHAINE ÉTAPE = ton GO PUSH** : `git push origin retouches-design` puis merge dans `main` (ou push direct main) → Vercel auto-déploie. Le QR pointe déjà sur la prod, donc rien à recâbler. Tester avec quelques proches, puis vider la base avant le 11/07.

## CAPACITÉ + STORAGE (30/06/2026) — FAIT + déployé (commit 87ca76d)
Suite aux questions de Cyril sur la capacité et le rangement Supabase.
- **Constat capacité** : plan Free Supabase = ~1 Go storage + ~5 Go bande passante/mois (à confirmer dans Settings→Usage). Le code stockait les photos **brutes** (pas de compression, `sharp` n'était pas installé), 2-5 Mo/photo → **~340 photos max pour TOUT le mariage** (pas par jour), soit ~2,6/convive sur 130. La projection en boucle (refresh 15s) menaçait surtout la bande passante. Limite « par jour » : il n'y en a pas, juste rate-limit 30/h/IP + 10 à la fois + 15 Mo/photo.
- **Fix compression** : `sharp` installé (validé Cyril) + pipeline dans `/api/upload` : `.rotate()` (auto-orientation) + `resize(1600, fit inside)` + `jpeg(q72)`. Poids ÷8-10 → capacité ~×9 (~3000 photos) et bande passante effondrée. Repli try/catch sur l'original si sharp échoue. Convertit tout en JPEG → un HEIC devient lisible par la modération (règle le pending HEIC).
- **Dossiers par jour** : le chemin storage passe de plat à `{jour}/{nom}.jpg` (`vendredi/`, `samedi/`, `dimanche/`, `a-classer/`). Jour calculé AVANT l'upload. `filename` (colonne DB) stocke le chemin complet, utilisé aussi en lecture (`createSignedUrl` dans `app/api/photos/route.ts`) → cohérent. **Caveat** : le dossier reflète le jour choisi à l'envoi ; une reclassification via le modérateur change la DB mais PAS le dossier du fichier. C'est une commodité dashboard, le tri applicatif reste piloté par la colonne DB `moment`.
- **Migration** : aucune. La base est vide (0 photo), donc pas d'anciens fichiers à plat à déplacer. Les nouveaux uploads créent les dossiers automatiquement.
- **Preuves** : `tsc` clean, `next build` OK (sharp bundle bien, `runtime nodejs`), test E2E auto-nettoyant contre le vrai bucket (upload `samedi/` + compression 70k→11k + signed URL + remove, zéro insert base, zéro appel Claude). Au push, Vercel installera sharp (linux) automatiquement.

## État (29/06/2026) — fonctionnel, déployé, vérifié
Appli de partage de photos pour le mariage du 11/07. Stack : Next.js 16 + Supabase (storage `Photos` + table `photos`) + Vercel.
- Repo : `cyrilfrancisco20/wedding-photos`. Projet Vercel renommé `photosmariage1107`, prod sur `main` (auto-deploy au push).
- **URL prod (= QR) : https://wedding-photos-phi-beige.vercel.app**
- Pages : `/` (upload invités, 2 boutons « Prendre une photo » caméra / « Choisir depuis l'album » ; QR encode `NEXT_PUBLIC_APP_URL`), `/moderateur` (file `pending`, mot de passe), `/projection` (diffusion écran géant, auto-refresh 15 s, n'affiche que `approved`).
- Flux : upload → `/api/upload` → storage → modération IA (`lib/moderate.ts`, Claude Haiku 4.5 vision, sortie JSON) → statut `approved`/`rejected`/`pending` → insert. `approved`→projection, `pending`→modérateur, `rejected`→nulle part. Fail-safe : erreur ou clé absente → `pending`.
- Vérifié E2E local + prod : bloque uniquement sexuel/violence/haine/drogue, approuve le reste (y compris hors-sujet), fail-safe OK.

## Sécurité (assainie cette session)
Clé Anthropic rotée + sur Vercel. PAT GitHub retiré du `.git/config` (auth via trousseau macOS). Supabase migré sur `sb_secret` ; clés legacy `anon`/`service_role` désactivées. n8n MCP retiré de `~/.claude/mcp.json`.

## Variables d'env (local + Vercel)
`NEXT_PUBLIC_APP_URL`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (= publishable), `SUPABASE_SERVICE_ROLE_KEY` (= sb_secret). Les `NEXT_PUBLIC_*` sont figées au build → **redéployer après tout changement**.

## Tri par moment + galerie (29/06/2026) — DÉPLOYÉ EN PROD (commit cb71ebf, main)
Mergé dans main, prod vérifiée : `/galerie` répond 200 sur l'URL du QR. Migration SQL appliquée. Base vidée des photos de test (14 supprimées storage+base, repart vide pour le 11/07).
**Découverte clé du test physique iPhone : iOS strippe `DateTimeOriginal` à l'upload web (album).** Le fichier garde les tags techniques (orientation, dimensions) mais perd la date de prise de vue + GPS (confidentialité, au niveau OS, donc lecture EXIF côté navigateur n'y change rien). Le tri 100% auto sur la date est mort pour les iPhone (majorité des invités).
Solution retenue : **sélecteur de moment sur la page d'envoi**, pré-rempli sur le moment courant (horloge). Priorité dans `/api/upload` : date EXIF si présente (Android/desktop) > moment choisi par l'invité > heure d'upload. La projection en direct reste juste.
Projection : forçage manuel via `?moment=<id>` (ex. `/projection?moment=aperitif`) — ignore l'horloge + la veille, sert au test avant le jour J et de secours si l'horaire dérape (commit 94bbf65).
Validé en prod le 29/06 : upload + sélecteur + modération IA auto (approuve seule, clé OK sur Production) + classement + projection forcée + galerie. Base revidée après tests (0 photo).
À faire éventuellement : ajouter `ANTHROPIC_API_KEY` + `MODERATOR_PASSWORD` à l'env **Preview** de Vercel (sinon les previews mettent tout en `pending`, faute de clé — c'est ce qui a brouillé les tests). Non requis pour la prod.

### Détail technique (inchangé)
Tri par moment de la journée.
- `lib/schedule.ts` = source unique du planning (fenêtres Europe/Paris, offset +02:00 figé car juillet = CEST sans bascule). 8 moments sur 3 jours (ven/sam/dim). Cérémonie 15h-17h50 = `projects:false` (projection en veille). Hors fenêtre ou pas d'EXIF → `a-classer`.
- Upload (`/api/upload`) : `exifr` (v7.1.3, 0 dep, installé) lit la date brute, `exifDateToParisISO` la passe en +02:00, `bucketForTakenAt` range. Colonnes `taken_at` + `moment` stockées.
- Galerie `/galerie` (UX « fil du jour ») : 3 onglets jour, chapitres chronologiques par moment, lightbox. Lien depuis `/`.
- Projection `/projection` : auto-calée sur le moment courant (recalcul à chaque refresh 15s), complétée par les photos du jour si le créneau est maigre ; veille pendant cérémonie / hors créneaux / créneau vide.
- Modérateur `/moderateur` : vues « En attente » + « À classer », sélecteur de moment par photo pour réaffecter.
- Preuves : 26 assertions logique planning OK (dont test anti-bug fuseau), round-trip sharp→exifr→dossier OK (apéritif/repas/mairie/brunch), fichiers sans EXIF → à classer OK. Build + lint = baseline (4 err préexistantes, 0 ajoutée).

## PROCHAINE SESSION = DESIGN / UX (priorité)
Objectif : refonte esthétique « mariage élégant » des surfaces, SANS toucher aux flux ni à la logique (schedule, sélecteur de moment, modération, signed URLs, override `?moment=`). Le fonctionnel est fini et validé en prod ; il s'agit d'habiller, pas de recâbler.

**Direction validée par Cyril : « A — Fil du jour »** (timeline). Déjà la structure de `/galerie` : onglets Vendredi/Samedi/Dimanche + chapitres chronologiques par moment. Les 2 autres directions proposées (B « Coffret de moments » = grille de cartes par dossier ; C « Galerie vivante » = mur mosaïque live) sont écartées pour la galerie, mais C peut nourrir la projection (ambiance cinéma).

**Surfaces, par priorité de design :**
1. `/galerie` (mobile, vitrine principale, là où les invités revivent la journée) → gros effort. Timeline éditoriale, typo soignée, chapitres élégants, lightbox.
2. `/projection` (TV paysage 16:9, fond noir, ambiance) → cinématique, sobre. Label du moment + compteur actuellement minimalistes.
3. `/` upload (mobile, premier contact invité) → doit donner le ton « faire-part ». Aujourd'hui : sélecteur « Quel moment ? » + 2 boutons + QR.
4. `/moderateur` → utilitaire, design secondaire.

**Esthétique actuelle (à intentionnaliser, c'est du quasi-défaut) :** accent `rose-500`, texte `stone`, corps en Georgia serif, fond dégradé `#fdf8f5`→`#f5ede6`, emoji 💍 en guise d'icône, boutons `rounded-2xl`. Tailwind v4 (`@import "tailwindcss"` dans `app/globals.css`, vars dans `:root` + keyframes fadeIn/crossfade).

**À cadrer avec Cyril en début de session design :** prénoms/monogramme du couple à intégrer ? palette voulue (garder le blush rose ou autre) ? pairing de polices (serif titres + sans corps ?) ? références d'inspiration (cf. mémoire native MotionSites.ai) ? la projection doit-elle matcher la galerie ou avoir sa propre ambiance ?
**Outils :** skill `frontend-design` installé (s'en servir). AGENTS.md impose de lire `node_modules/next/dist/docs/` avant tout code (Next 16 a des breaking changes). Emoji → envisager une vraie librairie d'icônes / un monogramme.

## Design projection — FAIT (29/06, non commité, vérifié 16:9 démo)
Surface #2 traitée. Pur habillage de `/projection`, AUCUNE touche au flux (playlist, schedule, fetch, forçage `?moment=`, veille). Inspiration : référence vidéo plein-écran cinéma fournie par Cyril.
- **Fond ambiant flou** : la même photo en `object-cover`, `blur(24px) brightness(0.42)`, remplace les bandes noires mortes. `will-change:transform` pour rasteriser le flou une fois (perf PC projection). Blur ramené de 48→24px car 48px plein écran = trop lourd.
- **Ken Burns** sur la photo nette (`object-contain`), sens alterné une diapo sur deux (`kenburns-a/b`).
- **Bas-de-cadre éditorial** (`lower-rise`, rejoué au changement de moment) : filet d'or `rule-draw` + kicker jour (`DAY_LABELS`) + moment en Cormorant italique + sceau.
- **Signature persistante** haut : sceau + « Morgane & Cyril » (g.), date (d.).
- **Jauge de progression** dorée en bas (`slide-progress`, 6s = SLIDE_DURATION) — remplace le compteur « 2/36 ».
- **Veille** : vrai carton-titre (sceau dérivant + couple + date + filet + message italique).
- Next 16 : `priority` est déprécié → utilisé `preload`. `tsc --noEmit` clean.
- CSS dans `globals.css` (bloc « Projection cinéma » + reduced-motion étendu).
- À trancher par Cyril (vu screenshots) : 2 sceaux à l'écran (haut-g + bas-g), un peu redondant — option : retirer celui du bas-de-cadre.
- **À VÉRIFIER avec de vraies photos** (la démo = dégradés plats, le flou ambiant + Ken Burns rendront bien plus fort sur de vraies images).
- Reste à habiller : #1 `/galerie` (gros morceau, vitrine mobile principale), #3 `/` upload, #4 `/moderateur`.
- Piège preview : `preview_resize` manuel (1280×720) a wedgé le renderer (screenshots en timeout) → capturer en taille native (déjà 16:9 ~1600×900), pas de resize manuel.

## Design upload (/) + galerie (/galerie) — FAIT (29/06, non commité, vérifié)
Suite de la session design. Toujours pur habillage, aucune logique touchée.
- **`/` (envoi)** : était la SEULE surface restée en ancienne charte (rose/stone/emoji 💍📸🖼️). Refaite en **« Nuit & or » sombre** (`--nuit-scene` + glow radial haut) pour faire écho à la projection (on shoote dans un écran sombre, la photo réapparaît sur la projection sombre). Monogramme M&C (sceau), « MORGANE & CYRIL » + date, titre Cormorant + filet d'or `rule-draw`, sous-titre qui dit ce qui se passe (« rejoignent le grand écran + la galerie »). **Vrais icônes SVG inline** (caméra/image/check, lucide-like, zéro dépendance) à la place des emoji. Champs/boutons sur `--nuit-raise` + `--filet-nuit`, bouton primaire or, micro-interaction `.lift` (soulèvement hover). États uploading (anneau `.spin`) / done (check or) / error refaits. QR en carte ivoire. Vérifié mobile.
- **`/galerie`** : était DÉJÀ en « Nuit & or » (le primer la disait « à habiller » mais une session l'avait déjà refaite : cover faire-part, carrousel « À la une », onglets givrés collants, timeline fil d'or + nœuds diamant, lightbox). Comme Cyril veut « moderne + dynamique », ajout de **mouvement** sans toucher la structure : entrée de cover **orchestrée** au chargement (`cover-rise` en cascade via animationDelay + fil `.thread` qui se dessine) ; **vignettes en cascade au scroll** (`.tile` couplé au système `.reveal/.is-visible`, délai par vignette) ; hover vignette = zoom doux + voile bas. Vérifié mobile (cover + timeline + carrousel).
- Nouveaux tokens `globals.css` : `--nuit-raise`, `--filet-nuit`. Nouvelles anims : `spin`, `lift`, `coverRise`, `.tile` reveal-couplé. Toutes désactivées en `prefers-reduced-motion`.
- `priority` → `preload` aussi dans galerie (carrousel + lightbox), cohérent avec projection.
- node_modules partiellement installé (pas de `.bin`/typescript) → `tsc` indispo cette session ; vérif via dev server (compile à la volée, 0 erreur logs + console) au lieu de `tsc --noEmit`. **À refaire un `npm install` + `tsc` propre avant commit.**
- Reste : `/moderateur` (#4, utilitaire, design secondaire) — pas traité.
- Charte des 3 surfaces principales : galerie = ivoire clair (album qu'on feuillette), upload + projection = nuit sombre. Cohérence par tokens + monogramme + Cormorant, pas par fond identique. Assumé.

## PIVOT DIRECTION DESIGN (30/06) — Variante A « éditorial doux », projection garde le contraste
Cyril a montré des refs Squarespace mariage (Rey, Laurie « Fluid ») et rejeté les pistes « vitaminé illustré » (agrumes dessinés = jugé kitsch). Direction validée :
- **Variante A « Plein cadre, romantique »** = langage du site/galerie : photo plein cadre en héro, serif délicat (Cormorant) + sans en capitales espacées, beaucoup de blanc, **rappels de couleur en pastel** (blush/sauge), **transitions fluides au scroll** (image qui s'ouvre en volet `clip-path`, texte qui monte, léger zoom héro). Doux, photo-roi. (Variante B « éditorial décalé » écartée mais dispo si besoin.)
- **Projection** : garde le **contraste sombre** déjà construit (la photo prime). NE PAS la passer en clair/éditorial.
- Statut « Nuit & or » : remplacé par Variante A pour galerie/accueil. Upload : à rebasculer aussi (était sombre, à reconsidérer dans la nouvelle charte claire — à trancher).
- **Maquette réelle construite : route `/apercu`** (`app/apercu/page.tsx`, jetable, n'impacte aucune surface réelle). Vérifiée mobile bout en bout (héro + histoire + bande 3 photos + bande rappel blush + mosaïque éditoriale + pied monogramme). CSS dans `globals.css` bloc « Maquette Variante A » (`mq-zoom`, `mq-wipe`, reduced-motion OK). Palette inline dans la page (ivory/blush/sage/terra/ink), ne touche pas les tokens globaux.
- **BLOCAGE photos** : les images collées dans le chat ne sont PAS sur le disque (scratchpad vide, introuvables) → impossible d'utiliser la photo de famille / les photos vitaminé directement. Placeholders libres de droits téléchargés dans `public/maquette/` (`hero.jpg`, `g1..g5.jpg`, via Lorem Picsum, random/non-thématiques). **Cyril doit déposer ses vraies photos sous ces mêmes noms** dans `public/maquette/`, ou donner un chemin à copier. Tant que placeholders aléatoires : ne pas juger la palette (les rappels semblent plaqués), juger mise en page/typo/mouvement.
- Prochaine étape une fois photos + maquette validées : intégrer Variante A dans les vraies surfaces (cover galerie + accueil), retirer `/apercu` et `public/maquette/`.

### Avancement maquette /apercu (30/06, suite)
- Variante A enrichie : section « Notre histoire » remplacée par **« Partagez vos photos »** avec 3 tuiles **jour** (Vendredi/Samedi/Dimanche) cliquables → déplient « Prendre une photo » / « Joindre une photo » (interaction front OK, envoi réel NON câblé dans la maquette). Bannière de fin ajoutée (« Merci d'être là… »).
- Vraies images en place dans `public/maquette/` (déposées par Cyril via Finder, car images du chat inaccessibles) : `hero.png` = faire-part agrumes Morgane & Cyril ; `g1.jpg` = sa vraie mairie (Chadeleuf) ; `banner.jpg` = gros plan agrumes (`instantshooting-zestedefolie-albeeditions_021`). Hero : texte superposé RETIRÉ (le faire-part porte déjà prénoms/date), juste un « Découvrir ». Bannière : voile radial renforcé pour lisibilité du texte blanc sur image claire.
- Images CC libres de droits (placeholders, à créditer si publiées, sinon à remplacer) : `g2.jpg` = cérémonie jardin (Wikimedia CC-BY), `g3.jpg` = brunch (Flickr CC-BY). Restent 2 placeholders random dans la mosaïque galerie : `g4.jpg` (escalator, tuile lead) + `g5.jpg` (reflet d'arbre) → à remplacer.
- Workflow images : Cyril dépose dans `public/maquette/` via Finder (ouvert par `open`), dit « ok », je détecte le fichier le plus récent et je le câble (cp + `sips -Z` pour alléger).

### DÉCISION ACTÉE (30/06) : rangement PAR JOUR
Cyril tranche : les photos se rangent **par jour** (Vendredi/Samedi/Dimanche), on abandonne les 8 moments fins. Touche le code DÉPLOYÉ → à faire sur branche, testé, prod seulement après validation. Impacts : `schedule.ts` (8 moments→3 jours), `/` (sélecteur jour = 3 tuiles), `/projection` (défilement par jour), `/galerie` (chapitres par jour), `/moderateur` (réaffectation par jour).
- Cyril a tranché : PAS d'exception cérémonie (projection en continu le samedi). Et « go » pour le refactor + déploiement test + QR.

### REFACTOR PAR JOUR — FAIT (30/06), branche `refonte-par-jour`, vérifié local
Commits : `1934cdf` (checkpoint design) + `4e07dd6` (refactor par jour). Non poussé.
- `schedule.ts` réécrit : `Bucket = Day | 'a-classer'`, fenêtres `DAYS` (ven jusqu'à sam 05:00, sam jusqu'à dim 08:00, dim), `dayForInstant`/`dayForTakenAt`/`dayById`. Supprimés : MOMENTS, momentForInstant, bucketForTakenAt, etc. La colonne DB `moment` stocke désormais un JOUR.
- `/` (page.tsx) entièrement refaite : Variante A claire, hero `/maquette/hero.png`, 3 tuiles jour (`/maquette/g1=mairie, g2=cérémonie, g3=brunch`) → clic déplie « Prendre/Joindre une photo » → **vrai POST `/api/upload`** avec le jour. QR + galerie link + footer. Vérifié mobile, interaction OK.
- `/projection` : `?moment=` → `?jour=`, playlist = photos du jour courant, plus de veille cérémonie, bas-de-cadre = libellé du jour. Contraste sombre conservé. Vérifié `?demo=1&jour=samedi`.
- `/galerie` : un chapitre = un jour. Vérifié `?demo=1` (onglets + grille). NB : encore en accent OR (Nuit&or), pas terra (polish à faire).
- `/api/upload` : priorité jour choisi > EXIF > heure d'upload. `/moderateur` + `/api/moderate` : OK par jour.
- Vérif via dev server (pas de tsc : node_modules incomplet). Buffer `preview_console_logs` pollué d'erreurs périmées de l'ancien import, ignoré (rendu réel OK).

### DÉPLOIEMENT + QR — EN ATTENTE DU GO PUSH (infra Cyril)
Le QR encode `NEXT_PUBLIC_APP_URL` (= prod `wedding-photos-phi-beige.vercel.app`). Pour un vrai test invité, le QR doit pointer sur l'URL déployée → le plus simple = déployer la branche en PROD (même URL), le QR marche direct, test avec quelques proches, puis **vider les photos de test de la base avant le 11/07**. Push = infra Cyril, attendre son « déploie ». Caveats : build Vercel fera le vrai typecheck (si casse, corriger) ; `/apercu` + `public/maquette/` encore présents (inoffensifs, `/` en dépend) ; galerie palette or à aligner.

## Next steps / blockers (hors design)
1. Optionnel : ajouter `ANTHROPIC_API_KEY` + `MODERATOR_PASSWORD` à l'env **Preview** de Vercel (sinon previews = tout en `pending`). Non requis pour la prod.
2. Supprimer Tally (`BzgboN`) + base Airtable (`apppWweFzCAhxtdZX`) : vestiges no-code, inutiles.
3. HEIC iPhone → `pending` côté modération (Claude vision ne lit pas HEIC) ; iOS convertit en JPEG à l'upload web (confirmé au test). Conversion serveur HEIC→JPEG faisable (sharp dispo) si besoin.
4. Lint : 4-5 erreurs `react-hooks/set-state-in-effect` préexistantes, le projet ne bloque pas dessus.
