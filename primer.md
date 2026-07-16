# Primer — wedding-photos (appli photos du mariage, 11/07/2026)

## ÉTAT (16/07/2026, clôture) — 4 pannes trouvées, corrigées, DÉPLOYÉES ET VÉRIFIÉES EN PROD

`main` = `origin/main` = `2e99c87`. Déploiement Vercel confirmé (marqueurs présents dans le bundle servi). Upload E2E rejoué sur la vraie page déployée : **5 photos (4×3 Mo + 1×6 Mo) → « 5 photos envoyées », 5/5 intègres (plein + vignette JPEG lisibles), base rendue à 52**. Galerie prod : 52 photos, 0 URL cassée. `/`, `/galerie`, `/moderateur` → 200.

**LE LIEN EST PRÊT À ÊTRE DIFFUSÉ AUX INVITÉS.**

### La 4e panne, trouvée en vérifiant le déploiement (la plus grosse)
**Vercel rejette tout corps de requête > ~4,5 Mo** (413 `FUNCTION_PAYLOAD_TOO_LARGE`), AVANT que la fonction ne démarre. Mesuré en prod : **4,40 Mo passe, 4,93 Mo non**. Une photo d'iPhone pèse 2-4 Mo : UNE passait, **DEUX d'un coup partaient en 413**, perdues toutes les deux, avec un message illisible (le 413 n'est pas du JSON, `res.json()` renvoyait « Unexpected token » à l'invité). C'est le geste le plus courant après un mariage. Le découpage par 10 du commit précédent n'y changeait rien : c'est la TAILLE qui compte, pas le nombre.

Corrigé : découpage par taille cumulée (3,5 Mo/requête), réduction navigateur à 3000px pour les photos qui dépassent seules (identique à ce que sharp faisait ensuite côté serveur, donc photo finale inchangée ; l'EXIF saute pour celles-là, tri sur l'heure d'envoi assumé — une photo mal triée reste récupérable, une photo en 413 est perdue), parse défensif des réponses non-JSON. Garde serveur « max 15 Mo » aligné sur le réel (4,4 Mo) : il n'avait jamais pu s'exécuter.

### LEÇON DE MÉTHODE (à retenir)
J'ai conclu 24 fois « pas encore déployé » avec une sonde cassée : le bundle minifié contient `Pr\xe9paration`, pas `Préparation`, donc mon grep sur la chaîne accentuée ne pouvait rien trouver, même en local. Le code était en ligne depuis le début. **Valider la sonde sur un cas connu-positif avant de croire un négatif.**

### Le problème posé
Cyril ne voyait que 50 photos dans la galerie alors que « beaucoup plus » ont été partagées le weekend du mariage.

### Ce qui est établi (mesuré, pas supposé)
- Galerie = **52 photos servies**, dont **50 en samedi** (l'onglet qu'il regardait). Base = 52 lignes, storage = 52 fichiers, cohérent.
- **La base n'a JAMAIS contenu plus de 65 lignes.** Un seul bucket (`Photos`), zéro orphelin. Les photos manquantes ne sont pas « quelque part » : elles ne sont jamais arrivées. Seule copie = les téléphones des invités.

### Cause racine : QUATRE murs côté upload, tous invisibles pour l'invité
(le 3e = le 413 Vercel décrit tout en haut, le plus coûteux ; le 4e = le bug UTF-8 du 11/07 14h30, qui a tué tout le vendredi soir)
1. **`checkRate` plafonnait à 30 uploads/h/IP** (`app/api/upload/route.ts`). Les 130 invités étaient derrière le WiFi du lieu = 1 seule IP. À 21h le 11/07, 35 photos passent (le `Map` est en mémoire, donc compteur par instance lambda), puis 429 « réessayez dans 1h » pour tout le monde. Uploads : 35/h → 1/h. Les rares survivants étaient en 4G. **Corrigé : plafond à 300** (une IP couvre une foule, pas une personne).
2. **Le client envoyait tous les fichiers sélectionnés en une requête**, alors que l'API en refuse plus de 10. Un invité qui sélectionne 25 photos de sa pellicule recevait un 400 et n'en envoyait **aucune**, pas 10. **Corrigé : paquets de 10 en série**, un paquet qui casse n'emporte pas les suivants.

L'egress Supabase (hypothèse de départ, primer du 30/06) **n'était PAS la cause. Question CLOSE, vérifiée sur le dashboard le 16/07** : org `Cyril-Fnsc` est sur le **Pro Plan**, cycle **30 juin - 30 juillet** (et non « reset Free le 26/07 » comme l'écrivaient les primers précédents : cette date était fausse). Egress **8,05 / 250 Go (3 %)**, cached 4,86 / 250 Go, storage 0,014 / 100 Go, overage 0. « You have not exceeded your Pro Plan quota in this billing cycle. »

Conséquence : Cyril était **déjà en Pro pendant le mariage** (cycle ouvert le 30/06), avec 250 Go. Il en a consommé 8 sur tout le mois. L'egress n'a donc jamais rien bloqué le 11/07, à aucun moment. Le diagnostic 413 + 429 est la totalité de l'explication. **Plus aucune inconnue sur l'infra : le lien peut partir aux 130 invités sans risque de quota.**

### Autres corrections de la session
- `verify_deploy.mjs` **désamorcé** : il identifiait sa ligne de test par « la dimanche la plus récente » et la supprimait. Avec de vraies photos dimanche en base, il aurait détruit une photo d'invité. Il cible maintenant par `id` (empreinte avant/après). La vraie photo du 12/07 15h33 est intacte.
- `/api/photos` : les lignes sans fichier storage étaient **filtrées en silence** (`signed.filter(p => p.url)`), d'où 61 approved → 52 affichées sans le moindre signal. Logue désormais.
- **13 lignes fantômes purgées** (9 approved + 4 rejected) : photos de test du 30/06 + détruites par le bug UTF-8 d'avant le fix Blob du 11/07 14h30. **Aucune photo d'invité.** Sauvegarde JSON dans le scratchpad de session (éphémère).
- `AGENTS.md` : conventions git du repo (commit direct sur `main`, `type(scope): sujet`, scopes = routes `app/`). Chargé seulement dans ce repo. Testé : `claude -p` répond juste depuis le repo, `NON` depuis `~/Claude`.
- 4 branches mortes supprimées (local + origin), toutes contenues dans `main`, zéro perte.
- **Home nettoyée** pour la relance : mention « grand écran » retirée (le mariage est passé) + lien `/couchages` retiré. Ne restent que l'action d'envoi et le lien galerie.

### Preuves exécutées
`tsc` clean, `next build` OK. Découpage testé dans le navigateur avec `fetch` stubbé : **25 fichiers → 3 requêtes (10/10/5)**, zéro doublon, zéro oubli, message « 25 photos envoyées pour Samedi ». Ancien code sur la même sélection, contre la vraie API locale : **HTTP 400, zéro photo**. Upload prod E2E : 200, JPEG valide en storage, nettoyage OK. Base restée à 52 lignes après tous les tests (rien pollué).

### NEXT STEPS
1. **FAIT** : déployé et vérifié en prod le 16/07.
2. **Le lien peut être diffusé aux 130 invités.** Les 4 murs sont tombés, prouvé sur la vraie page déployée.
3. **FAIT** : dashboard vérifié le 16/07. Pro Plan, egress 8,05/250 Go (3 %). Aucun risque de quota, plus rien à vérifier côté infra.
4. Liens vérifiés 200 : upload `https://wedding-photos-phi-beige.vercel.app/` (= ce qu'encode le QR), galerie `.../galerie`.

### BLOCKERS
- Aucune photo du 11/07 au soir n'est récupérable côté serveur. La seule voie = redemander aux invités d'uploader. D'où l'importance que le lien marche du premier coup.
- Logs Vercel inaccessibles (CLI absent, aucune session locale). C'est ce qui aurait confirmé les 429 directement ; le faisceau (code + courbe horaire) est concordant mais reste une déduction.

### DETTE
Ce fichier fait ~44 Ko et a viré au journal, exactement ce que la règle 08 interdit (« l'état, pas l'historique »). À resserrer : garder cette section + le bloc « Contexte projet », archiver le reste. Non fait cette session, pas mon appel de supprimer son historique sans son go.

---

## ÉTAT (08/07/2026, clôture) — /plan-de-table : mobilier de service ajouté, DÉPLOYÉ EN PROD
`main` = `origin/main` = `9c5e0bf` (poussé, Vercel auto-déploie). Build local `next build` OK avant push. Commit = uniquement `app/plan-de-table/page.tsx` (les fichiers mémoire primer/tasks non inclus dans le commit prod).

Cyril a demandé d'ajouter le mobilier de service au canevas, dans le même langage visuel (fond ivoire, filet, font-display, échelle réelle `SCALE`). Ajouté en 3 passes successives :
- **Fontaine de champagne + Desserts** : 2 tables ~160×80 cm (longueur verticale) le long du **mur droit**, dans la zone piste de danse, bord droit calé sur le mur, empilées et centrées dans la hauteur de la piste. Profondeur 80 cm **supposée** (buffet standard) — à confirmer par Cyril.
- **Zone DJ** : carré 2,50×2,50 m dans l'**angle bas-gauche** de la piste (bord bas + mur gauche).
- **Photobooth & accessoires** (2×1 m) + **tonneau livre d'or / urne** (cercle ~70 cm) : d'abord posés au milieu de la bande haute, puis **collés contre le mur des cuisines** (mur du haut) sur demande de Cyril, centrés dans la largeur. Label « Passage cuisines / WC » redescendu en bas de sa bande pour éviter le chevauchement.
- **Point ouvert signalé à Cyril** : le photobooth recoupe le passage cuisines/WC marqué « aucun mobilier » — maintenant collé au mur pour libérer la circulation centrale, à valider côté prestataires. Le titre affiche toujours « 14 tables » (compte des tables assises ; le mobilier de service n'y entre pas — assumé).
- Constantes ajoutées dans `page.tsx` : `SERVICE_*`, `DJ_*`, `PB_*`, `BARREL_*`, `TOP_GROUP_*`. Vérifié en dev (preview) : positions DOM lues (px), screenshots des 3 zones. Pas encore vérifié en HTML prod (déploiement en cours au moment de la clôture).

## ÉTAT (07/07/2026, clôture) — /plan-de-table : refonte aménagement salle, DÉPLOYÉ EN PROD + vérifié
`main` = `origin/main` = `adb9a01`. Poussé et vérifié en HTML prod (200, marqueurs 128 convives/14 tables/Gevrey-Chambertin/Santenay/Passage cuisines présents).

**Chemin suivi** (chaque contrainte donnée par Cyril a changé la conclusion) : salle 8x25m + table des mariés 7,5m testée d'abord en colonne verticale (ne rentre pas), puis dans la longueur sur un côté (fonctionne), puis avec les vraies dimensions mobilier (2 Ø180/10p + 12 Ø150/8p, reculs 100cm/80cm) → tenait large avec 8,6m libres. Piste table CARRÉE (4x250x90cm) explorée et **abandonnée** : ne logeait que ~17-18 convives sur 25 (périmètre insuffisant), jamais implémentée. Cyril a fini par dessiner lui-même l'aménagement définitif au marqueur (photo whiteboard) : **passage cuisines/WC (3m, sans mobilier) en haut de la salle** (pas la table des mariés — confusion levée en session), table des mariés **linéaire 7,5x0,9m dans la longueur, mur de droite, recul 1m**, 13 tables rondes en colonne serpentée avec reculs 80cm vérifiés sans collision. Cyril a ensuite demandé un rééquilibrage de l'espacement des trios 1/2/3 et 11/12/13, 2 noms de crus supplémentaires (Gevrey-Chambertin, Santenay), puis fourni la répartition exacte des effectifs par table.

**Liste nominative réelle** obtenue via `~/Desktop/Sans titre.pages` (128 convives, table par table) — le fichier `.pages` n'est pas lisible tel quel par les outils (binaire zip/iwa) ; extrait en l'ouvrant dans Pages.app via `osascript` puis export PDF, lu page par page. Les labels "Table 2/3/4..." de ce fichier sont un index interne à la liste, **sans rapport** avec les positions physiques 1-13 du plan — seul le nom de cru fait le lien, tout recoupé et vérifié cohérent (128 = 25 tête + 103 tables rondes).

**Implémenté** (commit `adb9a01`) :
- `lib/plan.ts` : `ROUND_TABLES` (13 tables, nom + diamètre + liste nominative des 128 convives), source unique. `HEAD_TOP`/`HEAD_BOTTOM`/`HEAD_END`/`headPlace()` inchangés (déjà corrects, revérifiés contre la liste réelle).
- `app/plan-de-table/page.tsx` : refonte complète du canevas à une échelle réelle unique (`SCALE` px/cm, ~0,933), table des mariés construite nativement verticale (fini le hack `rotate(90deg)` + texte à -52°), passage cuisines/WC affiché, 13 tables rondes positionnées aux coordonnées calculées (2 Ø180 rendues visuellement plus grandes que les 11 Ø150 — fidèle à la réalité, pas une taille schématique arbitraire comme avant). Titre au survol de chaque pastille = prénom du convive (nouveau, gratuit via l'attribut `title` déjà en place).
- **Menus spéciaux réinitialisés à classique partout** : l'ancienne liste (enceinte/vege/vegan, associée aux 11 anciennes tables) ne se reporte pas de façon fiable sur ce nouveau découpage à 13 tables → **à reconfirmer avec Cyril table par table avant impression des menus**.
- Preuves : `tsc --noEmit` clean, `next build` OK (page statique), lint = 1 erreur préexistante (`setInvite` dans un effect, déjà présente avant mes changements, vérifié par `git stash`), vérifié en dev (scroll, tables Ø150/Ø180, table des mariés, tooltip nom), déployé + vérifié en HTML prod.

## Next steps
- **Menus spéciaux à refaire** avec Cyril (qui est enceinte/végé/vegan parmi les 128, table par table) — actuellement tout classique.
- Écart total : 128 convives confirmé par Cyril (l'hypothèse 129 d'une session précédente était fausse, resolu).

## ÉTAT (06/07/2026, clôture) — TOUT DÉPLOYÉ EN PROD, vérifié
`main` = `origin/main` = `769eec8`. Session longue, tout poussé et confirmé en HTML prod à chaque étape (jamais de push sans vérif derrière).

**`/couchages` (nouvelle page, déployée)** : dispatching des chambres pour 51 dormeurs, 3 bâtiments (château, annexe, gîte).
- Vraie vue aérienne IGN (`public/couchages/aerien2.jpg`, licence ouverte) avec détourage des 3 bâtiments, positions calées sur les coordonnées GPS données par Cyril — **corrigées 2 fois** : l'annexe était l'aile ouest/sud, en fait c'est la partie HAUTE (nord) du complexe ; le gîte n'était pas le bon bâtiment au premier essai.
- **Chemin d'accès au gîte** : d'abord une forme devinée à la main (« dog-leg » approximatif), puis **recalé au pixel près** à partir d'un PDF où Cyril a tracé la vraie clôture — converti par detection de couleur + Douglas-Peucker + transform GPS, vérifié par superposition (coïncide exactement). Ne plus deviner un tracé réel à l'oeil : demander/attendre la source si elle existe.
- Recherche par prénom, surlignage + scroll, photos de façade (château/annexe/gîte), badges enfant/nuit spécifique. Source unique : `lib/couchages.ts`.
- Dernier échange de chambres : JC+Julie.L ↔ Mathieu.D+Diane (JC+Julie.L → Georgina château, Mathieu+Diane → Annexe 4 lits). Audrey/Nathan/Benoit.P/Chloé passés en "sam. seult".
- Caveat non résolu : **Olivia à 5 personnes suppose 1 baldaquin + 3 simples**, jamais confirmé par le domaine.

**`/plan-de-table` (déployé)** : table des mariés pivotée 90° horaire, calée à droite (aménagement réel confirmé par Cyril), centrée sur les 3 rangées de tables rondes. Tables rondes en pixels fixes (jamais bougées). Couleur menu enceinte changée (bleu ardoise `#6E8AA3`). Permutations Clos de Vougeot ↔ Mercurey, Pommard ↔ Vosne-Romanée.

**`/temoins` (déployé)** : discours de Morgane porté à 4 (nouveau discours ajouté avant Carole, les 3 autres renumérotés), Cyril reste à 2 témoins + Carole. Timing recalculé : le discours ajouté (+6 min) est absorbé en raccourcissant le Set n°2 du groupe de jazz (60→54 min) — tout depuis la fin du jazz (19h34) est identique à l'original, **photos à 20h00 pile**, vérifié par calcul indépendant. Procession réduite à 8 groupes.

**Bug transverse corrigé sur les 3 pages (couchages, plan-de-table, temoins)** : le sceau M&C du footer n'était pas centré (`Seal` est en `display:flex`, un bloc — `text-align:center` du footer n'a aucune prise dessus). Fix : passer le footer en `flex flex-col items-center`. **Corrigé 3 fois séparément** parce que je ne l'ai pas propagé aux autres pages dès la 1ère découverte — voir leçon loggée.

## Blockers
Aucun technique. Reste ouvert côté Cyril : confirmer la capacité réelle d'Olivia (5 places) auprès du domaine.

## Next steps
- Si Cyril valide Olivia à 5, rien à faire. Sinon, revoir le dispatching château (`lib/couchages.ts`).
- Vider la base Supabase avant le 11/07 (rappel des sessions précédentes, toujours valable).
- Repasser en Free après le mariage (Pro pris pour l'egress).

## ÉTAT (02/07/2026) — /temoins DÉPLOYÉE EN PROD + /plan-de-table COMMIT LOCAL NON POUSSÉ
`/temoins` : poussée le 02/07 (commit `15e5e6e`), vérifiée en prod (200 + contenu). URL : https://wedding-photos-phi-beige.vercel.app/temoins
`/plan-de-table` : DÉPLOYÉE EN PROD le 02/07 (commits `de2d073` + `2a0fa08`), vérifiée (marqueur « aménagement réel » présent dans le HTML prod). URL : https://wedding-photos-phi-beige.vercel.app/plan-de-table
Plan de table refait à la charte depuis le plan Pages de Cyril : table des mariés Romanée-Conti (25) en haut, 11 tables rondes (noms = crus de Bourgogne, PAS « climats », corrigé par Cyril), pastilles menus (Pommard 1 enceinte, Aloxe-Corton 1 enceinte, Saint-Aubin 3 végé + 1 vegan, comptes VALIDÉS par Cyril), 129 convives. Lien croisé /temoins ↔ /plan-de-table, noindex.
Place au dîner cliquable (02/07, déployé + vérifié prod) : le placement nominatif vit dans **`lib/plan.ts`** (source unique : HEAD_TOP/HEAD_END/HEAD_BOTTOM + `headPlace()` + `planNameFor()` qui mappe les diminutifs Micka→Michael et Fred→Frédéric, mapping SUPPOSÉ, jamais infirmé par Cyril). Sur /temoins, sélectionner un prénom affiche « Votre place au dîner : Romanée-Conti, entre X et Y » + lien `/plan-de-table?invite=<prénom>` qui marque la chaise (pastille terra cerclée + prénom gras) et la centre par scrollIntoView. Les 12 témoins sont tous à la table des mariés. Table des mariés agrandie de 20 % (left 21.8 %, width 62.4 %, minHeight 101).
Table des mariés (corrections Cyril, toutes déployées + vérifiées prod) : 12 chaises par côté + 1 bout de table à droite (25), **placement nominatif** affiché (constantes `HEAD_TOP`/`HEAD_END`/`HEAD_BOTTOM` dans la page ; tour de table donné en partant d'en haut à gauche, `HEAD_BOTTOM` stocké de gauche à droite donc INVERSÉ par rapport au tour). Sous-titre = « crus de Bourgogne » (pas climats).
**CONTRAINTE ACTÉE par Cyril : la disposition des tables = l'aménagement réel de la salle, diffusé aux prestataires. NE JAMAIS réagencer les tables pour des raisons de design.** Implémentation : canevas absolu (positions x en %, y en px, `TABLES` dans la page), minWidth 760 + scroll horizontal sur mobile (pas de réempilement), rangées 1 et 3 alignées en colonnes, rangée 2 décalée.
- **Nouvelle route `/temoins`** (`app/temoins/page.tsx` + `layout.tsx` noindex) : déroulé minute par minute du jour J pour les témoins, à partir de la version « quasi finalisée » fournie par Cyril le 01/07 (PAS de l'ancien `~/Desktop/Mariage/logo.html`, périmé : ordre de procession changé, rituel du vin supprimé, horaires décalés, fin à 6h00).
- Charte Variante A réutilisée telle quelle : scope `.gal-a`, hero faire-part agrumes `/accueil/hero.png` en `mq-zoom`, `.reveal` au scroll, `.glass` sticky, Seal en pied. Zéro modif de `globals.css`.
- **Filtre par prénom** : barre sticky de chips (12 témoins), met en surbrillance les lignes + groupes de procession où le témoin intervient, estompe le reste. Tags dérivés STRICTEMENT du texte de Cyril.
- Non listée : aucun lien depuis `/`, `robots noindex`. Confidentialité faible (URL devinable) : jugé suffisant, à re-trancher si Cyril veut un mot de passe.
- Ambiguïté signalée à Cyril : ligne « G1 — 16h20 +10s — Carole & Cyril +20s » (le +10s ne colle pas avec les +20s), rendu = G1 à 16h20 puis +20s par groupe. Date confirmée 11/07 (faire-part + `lib/wedding.ts`) ; logo.html disait 12/07, faux.
- Preuves : `tsc --noEmit` clean, `next build` OK (`/temoins` statique), lint = 1 warning `<img>` (même baseline que l'accueil), vérifié mobile + desktop en dev (hero, timeline, procession, filtre Nelly, footer).

## ÉTAT À LA CLÔTURE (01/07/2026, session suivante) — hero réutilisé + filigrane retiré, QR livret remplacé, rotation impression EN ATTENTE Cyril
`main` = `origin/main` = `b96fbc9` (après `205402e`, `5006723`). Tout poussé et vérifié en HTML prod.

- **Hero réutilisé** sur `/galerie` (fond de la section cover, même `mq-zoom`) et `/projection` (écran de veille uniquement, pas pendant le diaporama actif). Overlay d'assombrissement unifié sur les 3 pages (accueil/galerie/projection) pour un niveau de contraste cohérent.
- **Filigrane ajouté PUIS RETIRÉ PARTOUT** : Cyril a d'abord demandé le sceau M&C + prénoms en petit coin sur accueil/galerie/projection (pour matcher la projection), puis est revenu dessus et a demandé de tout retirer + supprimer la légende « Le fil de la journée... » sur la galerie — le hero (faire-part imprimé) affiche déjà nom+date, la redondance n'apportait rien. Composant partagé `app/components/Seal.tsx` créé pendant l'aller-retour : **le garder**, toujours utilisé par la signature persistante de `/projection` pendant le diaporama actif (haut-gauche + bas-de-cadre), ne pas le supprimer même si plus utilisé sur accueil/galerie.
- **Livret imprimé** (hors repo, `~/Desktop/Livret_MC_A4_recto_verso.pages`) : faux QR remplacé par le vrai (image flottante indépendante 4,5×4,5cm, générée avec `qrcode.react` déjà présent dans le projet, superposée exactement sur l'ancien placeholder). Sauvegardé et vérifié visuellement. **Cyril doit scanner physiquement avant impression** (pas d'outil de décodage QR disponible pour vérifier moi-même). Fichier temporaire `~/Desktop/qr_wedding_photos.png` laissé sur le Bureau — à supprimer ou garder, Cyril doit trancher.
- **EN ATTENTE (Cyril)** : rotation 180° des 2 pages du livret pour l'impression recto-verso pliée en livret. Pas fait par moi — voir leçon dans `tasks-for-lessons.md` (échec de sélection d'objet en GUI, près de perdre le contenu d'une page, rattrapé par Cmd+Z). Instructions manuelles données à Cyril. Recommandé en premier : vérifier le réglage retournement recto-verso (bord court vs bord long) dans la boîte de dialogue d'impression avant de toucher au contenu — c'est souvent la vraie cause d'un livret mal imprimé, pas le contenu du document.

## ÉTAT À LA CLÔTURE (01/07/2026) — session SÉCURITÉ + red-team, tout déployé en prod + vérifié
`main` = `origin/main` = `2fbe1a0`. Trois commits poussés + auto-déployés Vercel (37e8886 gate, 6bb0981 durcissements+filet modérateur, 2fbe1a0 projection Variante A sombre + primer).

**Faille corrigée (commit 37e8886)** : `/api/photos` honorait n'importe quel `?status=` sans auth. `status=pending`/`rejected` renvoyait des URLs signées vers le contenu en attente ou bloqué par la modération (nudité, gore, haine). Fix : `approved` reste public, tout autre statut exige `x-mod-token === MODERATOR_PASSWORD` (401 sinon). La page `/moderateur` envoie ce token.

**Durcissements + filet modérateur (commit 6bb0981)** :
- Compare token en temps constant (`lib/auth.ts`, `timingSafeEqual`), branché dans `/api/photos` + `/api/moderate`.
- `/api/upload` : extension dérivée du nom client nettoyée (plus de slash/caractères de chemin injectables sur le repli sharp).
- Prompt modération (`lib/moderate.ts`) durci : consigne anti-injection (le texte dans l'image = contenu à juger, jamais un ordre ; image manipulatrice → `pending`) + rejet des insultes/harcèlement visant une personne (blague/surnom affectueux → passe).
- **Flux choisi par Cyril = « filtre IA + filet »** : l'IA auto-approuve vers galerie + projection ; `/moderateur` a 2 nouveaux onglets : **En ligne** (retirer une photo live en 1 clic) + **Refusées** (récupérer un faux rejet, avec motif IA). Onglets « En attente » et « À classer » conservés.

**Vérifs de cette session** :
- Bypass direct Supabase testé avec la clé publique : REST table `photos` = 401, storage list = 403. Non exploitable. (À confirmer côté dashboard : RLS activé sur `photos` = ceinture si réactivation clés legacy.)
- Gate prod : `approved`→200, `pending`/`rejected` sans token→401, bon token→200. Login modérateur prod OK.
- **E2E réel complet** (upload → modération IA `approved` → galerie/projection → retrait onglet En ligne → `rejected`/Refusées → suppression ligne+fichiers) : nettoyé, zéro trace. Base propre.
- **Red-team (attaque de sa propre app, demandé par Cyril)** : Axe A (extraction) = échec, aucun contournement de la gate (double param/casse/null byte/tableau ne fait fuiter que du `approved` public), bucket privé (public 400, list 403). Axe B (bypass modération) = échec, injections « rejette-moi »/« approuve-moi » incrustées → toutes deux `pending` (modèle reconnaît la manipulation, n'obéit pas), insulte dirigée → `rejected`. Résiduel honnête : un vrai contenu inapproprié mal jugé par le modèle peut passer en `approved` (précision modèle, pas faille code) → filet = onglet En ligne ; zéro-risque écran = projection liste blanche (option 3, écartée). Tests nettoyés, zéro trace.

**MODERATOR_PASSWORD = `#Charlotte&Leon1319`** (fonctionne sur Vercel, stocké littéral). Piège : dans `.env.local`, le `#` en tête est lu comme commentaire → valeur vide. Corrigé en local par des guillemets `"..."`. Vercel non concerné.

**Projection réalignée (FAIT, commit 2fbe1a0)** : gardée sombre (grand écran) mais or froid + bleu-noir remplacés par le terra chaud Variante A. Nouveau scope `.proj-a` dans `globals.css` (espresso `#17100A`, or terra `#CE9264`), dégradés réchauffés, appliqué aux 2 états (veille + diaporama). Vérifié à l'écran + CSS prod contient `.proj-a`/`#17100a`/`#ce9264`.

**Ouvert / décisions Cyril** :
- **Rotation clés** Supabase service_role + Anthropic (exposées en clair pendant la session en ouvrant `.env.local`). Optionnel mais propre.
- **Zéro-risque grand écran** (si le scénario « truc moche en projection » l'inquiète) : passer la projection en liste blanche (rien ne s'affiche sans son clic). Écarté pour l'instant au profit du filet (onglet En ligne).
- Reports antérieurs : passer en **Pro** (egress, reset 26/07) + **vider la base avant le 11/07**.

## ÉTAT À LA CLÔTURE (30/06/2026) — tout déployé en prod, vérifié
`main` = `origin/main` = `228d8fe`, synchro (0/0). Tout ce qui a été fait cette session est LIVE et vérifié en prod (URL = QR : https://wedding-photos-phi-beige.vercel.app).
- **Design** : galerie + accueil en Variante A claire (terra/ivoire/Cormorant, override scopé `.gal-a`), modérateur rhabillé (icônes SVG), `/apercu` + `public/maquette/` supprimés (images réelles → `public/accueil/`). Projection volontairement laissée sombre/or.
- **Rangement** : photos triées par JOUR (ven/sam/dim), en base ET en dossiers storage `{jour}/...`.
- **Photos** : compression sharp, version conservée **3000px q88** (impression jusqu'au A4) + **vignette 600px** pour la grille (egress), bouton **Télécharger** dans la lightbox. HEIC converti/géré.

**Blockers / décisions en attente (côté Cyril, je ne peux pas les faire) :**
1. **Passer en Pro** (reco tranchée) : cycle de facturation reset le **26/07** (après le mariage), donc pas de quota egress neuf le 11/07 ; on attaque à ~2,6/5 Go = trop juste. Pro un mois ($25), redescendre en Free après. Storage non-concerné (tient en Free).
2. **Tester un vrai upload sur prod** (le seul flux non prouvé par moi pour ne pas polluer) : envoi → modération → galerie vignette → lightbox plein → Télécharger, + vérif dossier jour dans Supabase.
3. **Vider la base** après tests, avant le 11/07.

Détail technique des chantiers ci-dessous (référence).

## QUALITÉ IMPRESSION + EGRESS (30/06/2026) — DÉPLOYÉ EN PROD + VÉRIFIÉ (commit 228d8fe sur main)
Cyril veut **garder les photos en qualité imprimable** (tirages des favorites), pas un gadget jetable. Décision : version conservée en 3000px (pas 1600px), + vignettes pour l'egress.
- **Constat egress (vu sur dashboard Supabase)** : storage = non-sujet (base 24 Mo, storage 0,002 Go). Le vrai mur = **egress 2,624 / 5 Go déjà consommés AVANT le mariage** (surtout tests de dev, pas les invités). À surveiller.
- **Changement upload** (remplace le 1600px du commit précédent) : 2 dérivés par photo.
  * PLEIN : sharp cap **3000px q88** (~1-2 Mo) → tirage jusqu'au A4 (~250 dpi), JPEG (HEIC converti, orientation corrigée). Sert lightbox + téléchargement.
  * VIGNETTE : sharp **600px q72** (~30-50 Ko) à `<base>.thumb.jpg` → grille galerie (egress) + entrée modération (JPEG analysable, règle HEIC).
- **`/api/photos`** renvoie `thumbUrl` (vignette dérivée par regex `\.[^./]+$ → .thumb.jpg`, repli sur le plein si absente). **Galerie** : grille+carrousel = vignette, lightbox = plein, **bouton Télécharger** (récupère le 3000px).
- **Plan Pro : RECOMMANDÉ (egress).** Storage non-sujet (3000px = ~450 Mo/300 photos, tient dans Free 1 Go). MAIS cycle de facturation reset le **26 du mois** (facture 26/06 → prochain reset 26/07, APRÈS le mariage). Donc Free ne se recharge pas avant le 11/07 : on attaque à 2,6/5 Go, ~2,4 Go de marge = trop juste pour 130 invités (butinage + téléchargements pleins à ~1,5 Mo). Reco tranchée : **Pro un mois ($25, 250 Go egress), redescendre en Free après le mariage**. Cyril prêt à payer. Décision en attente côté Cyril.
- **Preuves** : tsc clean, next build OK, test E2E réel (plein 3000×2250 + vignette 600×450 28 Ko dans `samedi/`, signed URLs + dérivation cohérentes, nettoyé, zéro insert/zéro Claude), lightbox + bouton Télécharger vérifiés à l'écran. **Déploiement prod confirmé** : JS servi contient `Télécharger` + `thumbUrl`.
- **À FAIRE côté Cyril** : (1) trancher Pro (reco oui), (2) tester un vrai upload sur prod (envoi → modération → galerie vignette → lightbox plein → Télécharger), (3) vider la base avant le 11/07.

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
