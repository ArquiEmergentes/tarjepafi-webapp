import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CampusSettings } from '../domain/campus-settings';

@Injectable({ providedIn: 'root' })
export class CampusSettingsApi {
  private readonly http = inject(HttpClient);

  get(): Observable<CampusSettings> {
    return this.http.get<CampusSettings>(`${environment.apiBaseUrl}/settings`);
  }
}
