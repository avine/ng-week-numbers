# WeekHeaderComponent

Header custom pour mat-calendar / mat-datepicker affichant les numéros de semaine ISO (une puce par ligne de la grille).
Utilise uniquement l'API publique de MatCalendar (activeDate, currentView, stateChanges) — aucune manipulation du DOM.

## Installation
Copier le dossier `week-header/` dans votre projet.

## Utilisation
```ts
import { WeekHeaderComponent } from './week-header/week-header.component';
weekHeader = WeekHeaderComponent;
```
```html
<mat-calendar [headerComponent]="weekHeader" [(selected)]="date"></mat-calendar>
<!-- ou -->
<mat-datepicker [calendarHeaderComponent]="weekHeader"></mat-datepicker>
```

## Notes
- Numéros ISO 8601 : suppose une semaine commençant le lundi (locale `fr` → getFirstDayOfWeek() = 1).
- Clic sur une puce → activeDate = premier jour de la semaine dans le mois.
- Bloc semaines masqué en vue année / multi-années.
- Angular 17+ (control flow @if/@for, styleUrl).
