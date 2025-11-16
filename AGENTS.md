# Repository Guidelines

## Structure du projet & organisation des modules
Ce client Vite + React stocke tout le code d'exécution dans `src/`. `main.jsx` initialise React 19 tandis que `App.jsx` orchestre la scène par défaut. Rangez les médias importables dans `src/assets/`, utilisez `App.css` et `index.css` pour les règles globales, puis créez des dossiers `src/components/<Feature>/` lorsque l'interface grandit. Les fichiers statiques copiés tels quels vont dans `public/`, référencés via `/asset.ext`. Les configs (`package.json`, `vite.config.js`, `eslint.config.js`) restent à la racine.

## Commandes de build, test et développement
- `npm install` — installe les dépendances (Node 18+ recommandé).
- `npm run dev` — lance Vite en mode HMR sur http://localhost:5173.
- `npm run build` — produit le bundle optimisé dans `dist/`.
- `npm run preview` — sert `dist/` pour un contrôle rapide avant déploiement.
- `npm run lint` — exécute ESLint sur `src/` et les fichiers de config.

## Style de code & conventions de nommage
Privilégiez les modules ES, les composants fonctionnels et les hooks React. Composants/hooks en `PascalCase`, utilitaires en `camelCase`, fichiers de style en `kebab-case.css`. Indentez avec deux espaces, gardez les hooks au sommet des composants et segmentez les blocs JSX volumineux. ESLint applique déjà React Hooks/Refresh plus `no-unused-vars`; faites tourner `npm run lint` (ou `npx eslint src --max-warnings=0`) avant chaque commit. Préttifiez avec `npx prettier --check src` pour conserver les guillemets simples et virgules finales.

## Lignes directrices pour les tests
`@testing-library/react` et `@testing-library/jest-dom` sont disponibles; ajoutez `vitest` au besoin pour aligner les tests sur Vite. Placez les specs sous forme `Component.test.jsx` à côté du composant ou dans `src/__tests__/`. Utilisez les queries orientées utilisateur et ne moquez les primitives Three.js que si le rendu ralentit. Lancez `npx vitest --run` (optionnellement `--coverage`) et décrivez dans la PR les vérifications manuelles réalisées avec `npm run dev`.

## Commits & Pull Requests
Le dépôt part de zéro, adoptez donc immédiatement Conventional Commits (`feat(scene): ajouter le zoom`). Commits atomiques, description courte et référence d'issue dans le corps. Les PR doivent fournir un résumé, captures d'écran ou clips pour les changements visibles, ainsi qu'une checklist confirmant lint/tests (ou QA manuelle).

## Environnement & sécurité
Si `npm` est introuvable, sourcez le snippet `npm.md` pour corriger le `PATH`. N'exposez jamais de secrets dans `src/` ou `public/`; utilisez des variables `VITE_*` documentées dans la PR. Passez en revue chaque mise à jour de Drei/React-Three-Fiber, car leurs changements mineurs peuvent casser les shaders.
