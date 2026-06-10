# Design System — Liwaza eGov MCP

Système de design léger pour l'interface conversationnelle fiscale Cameroun.
Principes : **simple, lisible, professionnel**. Aucun décorum inutile.

---

## 1. Couleurs

### Palette principale

| Token | Valeur | Usage |
|---|---|---|
| `primary` | `#7C3AED` (violet-600) | Actions primaires, avatars assistant, accents |
| `primary-hover` | `#6D28D9` (violet-700) | Survol bouton primaire |
| `primary-light` | `#EDE9FE` (violet-50) | Fond carte suggestion au survol |
| `primary-border` | `#DDD6FE` (violet-200) | Bordure accentuée |
| `primary-text` | `#5B21B6` (violet-800) | Texte sur fond violet clair |

### Palette neutre (zinc)

| Token | Valeur | Usage |
|---|---|---|
| `bg-page` | `#FAFAFA` (zinc-50) | Fond général de la page |
| `bg-surface` | `#FFFFFF` | Cartes, sidebar, chat, header |
| `border-default` | `#E4E4E7` (zinc-200) | Séparateurs, bordures de composants |
| `border-input` | `#D4D4D8` (zinc-300) | Bordure champ de saisie |
| `text-primary` | `#18181B` (zinc-900) | Titres, labels principaux |
| `text-secondary` | `#52525B` (zinc-600) | Corps de texte |
| `text-muted` | `#71717A` (zinc-500) | Métadonnées, placeholders |
| `text-disabled` | `#A1A1AA` (zinc-400) | Texte désactivé |

### Couleurs sémantiques

| Token | Valeur | Usage |
|---|---|---|
| `success` | `#22C55E` (green-500) | Indicateur backend en ligne, validation OK |
| `warning-bg` | `#FFFBEB` (amber-50) | Fond disclaimer |
| `warning-border` | `#FDE68A` (amber-200) | Bordure disclaimer |
| `warning-text` | `#92400E` (amber-800) | Texte avertissement |
| `error-bg` | `#FEF2F2` (red-50) | Fond message d'erreur |
| `error-border` | `#FECACA` (red-200) | Bordure erreur |
| `error-text` | `#B91C1C` (red-700) | Texte erreur |

---

## 2. Typographie

### Familles de polices

| Rôle | Police | Variable CSS | Poids utilisés |
|---|---|---|---|
| Corps / UI | Inter | `--font-sans` | 400, 500, 600 |
| Titres / Display | Plus Jakarta Sans | `--font-display` | 400, 500, 600, 700, 800 |

### Échelle de tailles

| Nom | Classe Tailwind | Pixels | Usage |
|---|---|---|---|
| `xs` | `text-xs` | 12px | Labels metadata, crédits |
| `10px` | `text-[10px]` | 10px | Surtitre uppercase tracking-widest |
| `11px` | `text-[11px]` | 11px | Contenu sidebar, détails secondaires |
| `13px` | `text-[13px]` | 13px | Corps de message chat |
| `sm` | `text-sm` | 14px | Texte général, boutons |
| `base` | `text-base` | 16px | Sous-titres de section |
| `xl` | `text-xl` | 20px | Titre écran d'accueil |

### Règles

- Line-height corps : `leading-relaxed` (1.625)
- Surti­tres de section : `text-[10px] font-semibold uppercase tracking-widest text-zinc-400`
- Titres primaires : Plus Jakarta Sans (`var(--font-display)`)
- Corps et UI : Inter

---

## 3. Espacement

Basé sur l'échelle Tailwind (base 4px) :

| Token | Valeur | Usage courant |
|---|---|---|
| `space-1` | 4px | Micro-gaps (icône + label) |
| `space-2` | 8px | Gap interne bouton, gap liste |
| `space-3` | 12px | Padding interne carte compacte |
| `space-4` | 16px | Padding horizontal standard |
| `space-5` | 20px | Padding sidebar sections |
| `space-6` | 24px | Séparation entre groupes |
| `space-12` | 48px | Padding vertical écran vide |

---

## 4. Rayons de bordure

| Token | Classe | Usage |
|---|---|---|
| `sm` | `rounded-md` | Icônes, badges, avatars (6px) |
| `default` | `rounded-lg` | Logo header, disclaimer (8px) |
| `xl` | `rounded-xl` | Bulles chat, cartes suggestion, input (12px) |
| `full` | `rounded-full` | Indicateur de statut (point) |

---

## 5. Ombres

| Niveau | Classe | Usage |
|---|---|---|
| Légère | `shadow-sm` | Bulles assistant, cartes structured |
| Aucune | — | Bulles utilisateur, éléments plats |

---

## 6. Composants réutilisables

### Badge / Chip

```
px-1.5 py-0.5  text-[10px] font-bold uppercase tracking-wider
rounded-md border
```
Variantes : `violet` (MCP badge), `green` (online), `red` (offline)

### Bouton primaire

```
px-3.5 py-2.5  bg-violet-600 hover:bg-violet-700
disabled:bg-zinc-200 disabled:text-zinc-400
text-white rounded-xl transition-colors cursor-pointer
```

### Bouton fantôme (ghost)

```
px-2 py-1  text-xs text-zinc-500 hover:text-zinc-900
hover:bg-zinc-100 rounded-md transition-colors cursor-pointer
```

### Carte suggestion

```
px-4 py-3  rounded-xl border border-zinc-200 bg-white
hover:border-violet-300 hover:bg-violet-50/60
transition-colors text-left cursor-pointer
```

### Bulle utilisateur

```
px-4 py-3  bg-violet-600 text-white rounded-xl rounded-tr-sm
```

### Bulle assistant

```
px-4 py-3  bg-white border border-zinc-200 rounded-xl rounded-tl-sm shadow-sm
```

### Champ de saisie

```
px-4 py-2.5  text-sm bg-white border border-zinc-300 rounded-xl
placeholder-zinc-400 text-zinc-900
focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20
transition-all disabled:opacity-50
```

### Avatar (chat)

```
w-7 h-7  rounded-md flex items-center justify-center
```
- Utilisateur : `bg-violet-600`
- Assistant : `bg-zinc-100 border border-zinc-200`

### Disclaimer / avertissement

```
rounded-lg bg-amber-50 border border-amber-200 p-3
```

---

## 7. Mise en page

### Structure globale

```
Header fixe (57px)
└── Body (100vh - 57px)
    ├── Sidebar (268px, hidden < lg)
    └── Chat (flex-1)
        ├── Toolbar (48px)
        ├── Zone messages (flex-1, overflow-y-auto)
        └── Zone saisie (fixe en bas)
```

### Breakpoints actifs

| Breakpoint | Valeur | Effet |
|---|---|---|
| `sm` | 640px | Affiche textes secondaires header, label "Réinitialiser" |
| `lg` | 1024px | Affiche la sidebar |

### Conteneur messages

`max-w-3xl mx-auto` — limite la largeur des bulles sur grands écrans.

---

## 8. Animation

| Nom | Déclencheur | Durée | Easing |
|---|---|---|---|
| `msg-in` | Entrée nouveau message | 200ms | ease-out |
| `dot-bounce` | Indicateur de chargement | 1100ms | ease-in-out |

Respect de `prefers-reduced-motion` : toutes les animations désactivées si activé.

---

## 9. Accessibilité

- Contrastes respectés (ratio ≥ 4.5:1 sur textes principaux)
- `viewport meta` : `width=device-width, initial-scale=1`
- `lang="fr"` sur `<html>` (i18n natif)
- Bouton Send : `aria-label` explicite
- Bouton langue : `aria-label` explicite
- Bouton réinitialiser : `title` + label texte
- `prefers-reduced-motion` : couvert dans globals.css
- Police minimum : 10px (sidebar référence) — acceptable pour contenu secondaire

---

## 10. Icônes

Bibliothèque : **Lucide React** (SVG, viewBox 24×24, stroke 2)

Tailles utilisées :

| Contexte | Taille |
|---|---|
| Icônes dans avatars / sidebar | `w-3.5 h-3.5` |
| Icônes inline texte | `w-3 h-3` |
| Icône bouton Send | `w-4 h-4` |
| Icône écran d'accueil | `w-6 h-6` |
