import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { OrganisationsPage } from './organisation.model';

@Injectable({ providedIn: 'root' })
export class OrganisationsApi {
  private readonly http = inject(HttpClient);

  getPage(offset: number, limit: number): Observable<OrganisationsPage> {
    return this.http.get<OrganisationsPage>('/api/organisations', { params: { offset, limit } });
  }
}