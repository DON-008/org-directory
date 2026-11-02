import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./organisations/organisation-list').then((m) => m.OrganisationList),
  },
  { path: '**', redirectTo: '' },
];