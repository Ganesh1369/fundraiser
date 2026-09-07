import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class VolunteerService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    private adminHeaders(): HttpHeaders {
        const token = localStorage.getItem('adminToken') || '';
        return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    }

    // --- Public ---

    /** Roles, eligibility and the area-of-interest options — all from the database. */
    getPage(): Observable<any> {
        return this.http.get(`${this.apiUrl}/volunteer/page`);
    }

    getChallenge(): Observable<any> {
        return this.http.get(`${this.apiUrl}/volunteers/challenge`);
    }

    /**
     * The form carries two file uploads, so it is sent as multipart/form-data rather than
     * JSON. Booleans are stringified by FormData; the server coerces them back.
     */
    register(payload: Record<string, any>, photo: File | null, idProof: File | null): Observable<any> {
        return this.http.post(`${this.apiUrl}/volunteers`, this.formData(payload, photo, idProof));
    }

    // --- Admin ---

    /**
     * Same form, entered by staff. The server stamps the row as ICE-entered off the back
     * of this route, and skips the captcha and the public rate limit.
     */
    adminRegister(payload: Record<string, any>, photo: File | null, idProof: File | null): Observable<any> {
        return this.http.post(`${this.apiUrl}/admin/volunteers`, this.formData(payload, photo, idProof), {
            headers: this.adminHeaders()
        });
    }

    private formData(payload: Record<string, any>, photo: File | null, idProof: File | null): FormData {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
            if (v !== null && v !== undefined) fd.append(k, String(v));
        });
        if (photo) fd.append('photo', photo);
        if (idProof) fd.append('idProof', idProof);
        return fd;
    }
}
