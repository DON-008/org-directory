import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TPipe } from './i18n/t.pipe';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TPipe],
  template: `
    <h1 style="color: var(--color-brand)">{{ 'app.title' | t }}</h1>
    <router-outlet />
  `,
})
export class App {}
