import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly http = inject(HttpClient);
  private readonly messages = signal<Record<string, unknown>>({});

  async load(): Promise<void> {
    this.messages.set(await firstValueFrom(this.http.get<Record<string, unknown>>('/i18n/en.json')));
  }

  t(key: string, params: Record<string, string | number> = {}): string {
    const found = key
      .split('.')
      .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], this.messages());
    if (typeof found !== 'string') return key; // a visible fallback makes missing keys easy to spot
    return found.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''));
  }
}