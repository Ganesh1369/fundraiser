import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class VolunteerService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    // --- Public ---

    getChallenge(): Observable<any> {
        return this.http.get(`${this.apiUrl}/volunteers/challenge`);
    }

    /**
     * The form carries two file uploads, so it is sent as multipart/form-data rather than
     * JSON. Booleans are stringified by FormData; the server coerces them back.
     */
    register(payload: Record<string, any>, photo: File | null, idProof: File | null): Observable<any> {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
            if (v !== null && v !== undefined) fd.append(k, String(v));
        });
        if (photo) fd.append('photo', photo);
        if (idProof) fd.append('idProof', idProof);
        return this.http.post(`${this.apiUrl}/volunteers`, fd);
    }
}
