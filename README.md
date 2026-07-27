# Le Comptoir Boursier — version Netlify

Cette version est adaptée pour être déployée sur Netlify. Différence clé
avec la version "serveur classique" : au lieu d'un serveur Express qui tourne
en continu, on utilise des **fonctions Netlify** (qui s'exécutent à la
demande) et **Netlify Blobs** (le stockage clé-valeur intégré de Netlify) à
la place d'une base de données. Tu n'as ni serveur à gérer, ni base de
données à installer.

## Structure

```
comptoir-boursier-netlify/
├── netlify.toml                    → dit à Netlify où sont le site et les fonctions
├── package.json                     → dépendance nécessaire (@netlify/blobs)
├── public/
│   └── index.html                   → ton site (identique à avant)
└── netlify/functions/
    └── api.mjs                      → l'API (remplace window.storage)
```

## Déployer depuis ton téléphone, sans terminal

Tu n'as pas besoin d'ordinateur ni de ligne de commande. Voici le chemin le
plus simple :

**1. Créer un dépôt GitHub (via le navigateur de ton téléphone)**
- Va sur github.com, connecte-toi (ou crée un compte gratuit).
- Appuie sur "+" → "New repository". Donne-lui un nom, ex. `comptoir-boursier`.
- Une fois créé, utilise "Add file" → "Upload files" pour envoyer tous les
  fichiers de ce dossier, **en conservant la même structure de sous-dossiers**
  (glisse-dépose ou sélectionne-les depuis tes fichiers téléchargés).
- Valide ("Commit changes").

**2. Connecter ce dépôt à Netlify**
- Va sur app.netlify.com, connecte-toi (tu peux te connecter avec ton compte
  GitHub directement).
- "Add new site" → "Import an existing project" → choisis GitHub → sélectionne
  le dépôt que tu viens de créer.
- Netlify devrait détecter automatiquement `netlify.toml` (dossier de
  publication `public`, fonctions dans `netlify/functions`). Tu n'as rien à
  changer, clique sur "Deploy".

**3. Activer Netlify Blobs**
Netlify Blobs est activé automatiquement dès que ton code l'utilise (via
`getStore`) — rien à configurer manuellement dans la plupart des cas.

**4. C'est en ligne**
Netlify te donne une adresse du type `https://ton-site-1234.netlify.app`.
C'est ce lien que tu partages à tes stagiaires. Tu peux le renommer dans
les réglages du site Netlify ("Site configuration" → "Change site name")
pour avoir quelque chose de plus lisible, ex. `comptoir-boursier.netlify.app`.

## Et ensuite ?

Chaque fois que tu modifieras un fichier sur GitHub (via le navigateur, même
depuis ton téléphone), Netlify redéploiera automatiquement le site en
quelques dizaines de secondes.

Si un jour tu veux gérer ça depuis un ordinateur avec Git, ce sera aussi
possible — la structure du projet ne change pas.
