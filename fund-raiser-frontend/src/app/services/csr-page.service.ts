import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CsrPageService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    // --- Public ---

    /** Trust/compliance block + active projects with stats — everything the CSR page renders. */
    getPage(): Observable<any> {
        return this.http.get(`${this.apiUrl}/csr/page`);
    }
}
