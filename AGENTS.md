<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Workflow git

## Branches

Commit direct sur `main`. Pas de branche de feature, pas de PR.

Créer une branche seulement si le travail casse le site en cours de route et ne peut pas être livré en une passe. Dans ce cas : `type/sujet-court` (`feat/tri-par-moment`), et elle est mergée ou supprimée dans la session. Une branche qui survit à la session est une branche morte.

## Messages de commit

Format : `type(scope): sujet`

- Sujet en français, impératif présent, minuscule après les deux-points, pas de point final.
- 72 caractères max sur la première ligne.
- Corps optionnel, seulement si le « pourquoi » n'est pas évident. Séparé par une ligne vide.
- Zéro em-dash (règle 11).
- Accents conservés : `modération`, pas `moderation`.

### Types

| Type | Quand |
|---|---|
| `feat` | nouvelle capacité visible par un invité ou un modérateur |
| `fix` | correction d'un comportement cassé |
| `security` | durcissement (tokens, RLS, rate limiting, validation) |
| `style` | rendu visuel seul, aucun changement de comportement |
| `refactor` | réorganisation sans changement de comportement ni de rendu |
| `content` | texte, prénoms, horaires, données du déroulé |
| `docs` | primer, leçons, notes de session |
| `chore` | dépendances, config, outillage |

### Scopes

Calés sur les routes de `app/` :

`upload` · `galerie` · `projection` · `moderateur` · `plan-de-table` · `temoins` · `couchages` · `home` · `api` · `storage` · `deps`

Scope omis si le changement est transverse. Jamais deux scopes dans un commit : c'est le signe qu'il faut deux commits.

### Exemples tirés du repo

```
feat(upload): compression sharp + rangement par dossier-jour dans le storage
fix(upload): Blob binaire au storage, fini les JPEG corrompus en UTF-8
security(api): exige le token modérateur pour lire les photos non-approved
content(plan-de-table): Catherine en vegan, orthographe confirmée par Cyril
style(projection): réaligne la palette sur Variante A (terra chaud)
docs: clôture de session sécurité + red-team
```

Contre-exemples, ne pas reproduire (présents dans l'historique d'avant juillet) :

```
Plan de table : recul uniforme de 1m         → content(plan-de-table): ...
fix(security)+feat(mod): durcissement...     → deux commits séparés
checkpoint: design Nuit&or avant refonte     → pas un type, décrire le changement
```

## Avant de committer

Le commit est autonome (règle 13), mais il n'est pas gratuit :

- `npm run build` passe. Une erreur de type ou de build ne se committe pas.
- Changement visible dans le navigateur : vérifié dans le preview avant commit, pas après (règle 04).
- `primer.md` et `tasks-for-lessons.md` se committent avec `docs:`, jamais mélangés au code.

Push et déploiement : confirmation de Cyril requise (règle 13).
