# Handoff: Numéros de semaine dans le header de mat-calendar (option 1b « Règle de semaines »)

## Overview
Afficher les numéros de semaine ISO 8601 dans un `mat-calendar` / `mat-datepicker` Angular Material **sans ajouter de colonne à la grille et sans manipuler le DOM du calendrier**. L'info vit exclusivement dans un `calendarHeaderComponent` custom : une rangée de puces, une par ligne de la grille du mois, dans le même ordre.

## About the Design Files
`Calendar Week Header.dc.html` est une **référence de design en HTML** (prototype interactif), pas du code de production. La tâche : recréer l'option **1b** dans le codebase Angular cible, avec ses conventions (version d'Angular, DateAdapter utilisé, thème Material). Les options 1a, 1c, 1d du fichier sont des alternatives écartées — à ignorer.

Une implémentation de départ (non testée) est fournie dans `week-header/`. L'utiliser comme base, l'adapter au projet et la tester.

## Fidelity
High-fidelity pour le bloc semaines. Le reste du header (libellé mois/année, flèches) doit reprendre l'apparence du header Angular Material par défaut via `mat-button` / `mat-icon-button`.

## Contraintes impératives
- Aucune manipulation du DOM du calendrier (pas d'ElementRef sur MatCalendar, pas de querySelector, pas d'injection de colonne).
- Uniquement l'API publique : `MatCalendar.activeDate` (get/set), `MatCalendar.currentView` (get/set), `MatCalendar.stateChanges`, `DateAdapter`, `MAT_DATE_FORMATS`.

## Layout du header
1. **Ligne 1** (hauteur ~44px, flex, align center) :
   - `mat-button` : libellé mois/année en MAJUSCULES (`display.monthYearLabel`) + icône `arrow_drop_down` à droite. Clic : bascule `currentView` month ⇄ multi-year.
   - Spacer flex:1.
   - `mat-icon-button` `chevron_left` / `chevron_right` (aria-label « Précédent » / « Suivant »).
2. **Ligne 2 — règle de semaines** (uniquement si `currentView === 'month'`) : flex, gap 4px, padding 2px 8px 8px.
   - Légende « SEM. » : largeur 30px, Roboto 500 11px, letter-spacing .06em, uppercase, couleur on-surface-variant (#6b6e78).
   - Une puce par ligne de la grille (5 ou 6) : flex:1, hauteur 30px, radius 8px, bordure 1px outline-variant (#c5c8d4), fond transparent/blanc, texte primary (#203f78), Roboto Mono 500 12px, contenu = numéro ISO seul (ex. « 46 »).

## États des puces
- **Active** (la semaine contient `activeDate`) : fond primary (#3a5a9a), bordure transparente, texte on-primary (#fff).
- **Semaine en cours** (contient aujourd'hui) : point 4×4px, radius 2px, centré horizontalement à 3px du bas, couleur currentColor (blanc si active, primary sinon).
- Les deux états peuvent se cumuler.
- `title` / tooltip : plage de jours du mois couverte, ex. « 9 – 15 ».
- `aria-label` : « Semaine 46, 9 – 15 ».

## Interactions
- Clic sur une puce → `calendar.activeDate` = premier jour de cette ligne **appartenant au mois affiché** (le lundi, ou le 1er si la ligne commence au mois précédent). Ça ne sélectionne pas la date, ça déplace seulement la date active / le focus.
- Flèches : month ±1 mois, year ±1 an, multi-year ±24 ans (`addCalendarMonths` / `addCalendarYears`).
- Le header se met à jour via `calendar.stateChanges` → `markForCheck()` (OnPush). La navigation au clavier dans la grille met donc la puce active à jour.

## Calcul des semaines
- Lignes de la grille : offset = (getDayOfWeek(1er du mois) − getFirstDayOfWeek() + 7) % 7 ; une ligne commence à chaque `start = 1 − offset + 7k` tant que `start ≤ nbJours`.
- Numéro de la ligne = semaine ISO 8601 du premier jour de la ligne dans le mois (algorithme du jeudi).
- **Prérequis** : semaine commençant le lundi (locale `fr` → `getFirstDayOfWeek() = 1`). Sinon les numéros ISO ne correspondent plus aux lignes ; forcer firstDayOfWeek = 1 via l'adapter ou un adapter custom si besoin.
- Exemple de référence, novembre 2026 : lignes S44 (1), S45 (2–8), S46 (9–15), S47 (16–22), S48 (23–29), S49 (30).

## Design tokens (fallbacks si pas de tokens M3 `--mat-sys-*`)
- primary #3a5a9a · primary text #203f78 · on-primary #fff
- outline-variant #c5c8d4 · on-surface-variant #6b6e78
- Radius puce 8px · gap 4px · hauteur 30px
- Polices : Roboto, Roboto Mono

## Utilisation
```ts
weekHeader = WeekHeaderComponent;
```
```html
<mat-calendar [headerComponent]="weekHeader" [(selected)]="date"></mat-calendar>
<mat-datepicker [calendarHeaderComponent]="weekHeader"></mat-datepicker>
```

## À faire côté dev
- Vérifier la compatibilité avec la version d'Angular / Material du repo (le code fourni suppose Angular 17+ : @if/@for, styleUrl, takeUntilDestroyed).
- Tests unitaires : calcul ISO (années à 53 semaines, ex. 2026 ; passage d'année : décembre 2026 → S49–S53, janvier 2027 → S53–S5), puce active après navigation clavier, masquage en vue année.

## Files
- `Calendar Week Header.dc.html` — prototype interactif (option 1b = référence).
- `week-header/week-header.component.{ts,html,scss}` — implémentation de départ.
- `week-header/README.md` — notes d'installation.
