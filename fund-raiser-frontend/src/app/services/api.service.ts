import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    private getHeaders(isAdmin = false): HttpHeaders {
        const token = localStorage.getItem(isAdmin ? 'adminToken' : 'token') || '';
        return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    }

    // --- Auth ---
    login(email: string, password: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/auth/login`, { email, password });
    }

    register(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/auth/register`, data);
    }

    adminLogin(username: string, password: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/auth/admin/login`, { username, password });
    }

    validateReferral(code: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/auth/validate-referral/${code}`);
    }

    sendOtp(identifier: string, purpose: string = 'register'): Observable<any> {
        const body = purpose === 'register'
            ? { phone: identifier, purpose }
            : { email: identifier, purpose };
        return this.http.post(`${this.apiUrl}/auth/send-otp`, body);
    }

    verifyOtp(identifier: string, otp: string, purpose: string = 'register'): Observable<any> {
        const body = purpose === 'register'
            ? { phone: identifier, otp, purpose }
            : { email: identifier, otp, purpose };
        return this.http.post(`${this.apiUrl}/auth/verify-otp`, body);
    }

    forgotPassword(email: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/auth/forgot-password`, { email });
    }

    resetPassword(email: string, otp: string, newPassword: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/auth/reset-password`, { email, otp, newPassword });
    }

    // --- User ---
    getProfile(): Observable<any> {
        return this.http.get(`${this.apiUrl}/user/profile`, { headers: this.getHeaders() });
    }

    updateProfile(data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/user/profile`, data, { headers: this.getHeaders() });
    }

    uploadAvatar(file: File): Observable<any> {
        const formData = new FormData();
        formData.append('avatar', file);
        const token = localStorage.getItem('token') || '';
        const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
        return this.http.put(`${this.apiUrl}/user/profile/avatar`, formData, { headers });
    }

    removeAvatar(): Observable<any> {
        return this.http.delete(`${this.apiUrl}/user/profile/avatar`, { headers: this.getHeaders() });
    }

    uploadCorporateLogo(file: File): Observable<any> {
        const formData = new FormData();
        formData.append('logo', file);
        const token = localStorage.getItem('token') || '';
        const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
        return this.http.put(`${this.apiUrl}/user/profile/corporate-logo`, formData, { headers });
    }

    removeCorporateLogo(): Observable<any> {
        return this.http.delete(`${this.apiUrl}/user/profile/corporate-logo`, { headers: this.getHeaders() });
    }

    getDonations(period?: string): Observable<any> {
        const params = period && period !== 'all' ? `?period=${period}` : '';
        return this.http.get(`${this.apiUrl}/user/donations${params}`, { headers: this.getHeaders() });
    }

    getDonationSummary(): Observable<any> {
        return this.http.get(`${this.apiUrl}/user/donations/summary`, { headers: this.getHeaders() });
    }

    getReferrals(): Observable<any> {
        return this.http.get(`${this.apiUrl}/user/referrals`, { headers: this.getHeaders() });
    }

    getReferralPointsHistory(): Observable<any> {
        return this.http.get(`${this.apiUrl}/user/referrals/history`, { headers: this.getHeaders() });
    }

    subscribePush(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }): Observable<any> {
        return this.http.post(`${this.apiUrl}/user/push-subscribe`, subscription, { headers: this.getHeaders() });
    }

    requestCertificate(panNumber: string, donationId?: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/user/certificate-request`, { panNumber, donationId }, { headers: this.getHeaders() });
    }

    getCertificateRequests(): Observable<any> {
        return this.http.get(`${this.apiUrl}/user/certificate-requests`, { headers: this.getHeaders() });
    }

    // --- Events ---
    getActiveEvents(): Observable<any> {
        return this.http.get(`${this.apiUrl}/events`);
    }

    // --- Donations ---
    createOrder(amount: number, request80g: boolean = false, purpose: string = 'donation', projectId?: string | null, csrReferenceNumber?: string | null): Observable<any> {
        const body: any = { amount, request80g, purpose };
        if (projectId) body.projectId = projectId;
        if (csrReferenceNumber) body.csrReferenceNumber = csrReferenceNumber;
        return this.http.post(`${this.apiUrl}/donations/create-order`, body, { headers: this.getHeaders() });
    }

    getCsrSponsors(projectSlug: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/projects/${projectSlug}/csr-sponsors`);
    }

    getCsrSummary(): Observable<any> {
        return this.http.get(`${this.apiUrl}/user/csr-summary`, { headers: this.getHeaders() });
    }

    downloadCsrRollup(fy: string): Observable<Blob> {
        return this.http.get(
            `${this.apiUrl}/user/csr-rollup?fy=${encodeURIComponent(fy)}`,
            { headers: this.getHeaders(), responseType: 'blob' }
        );
    }

    getCsrCommitmentsForUser(): Observable<any> {
        return this.http.get(`${this.apiUrl}/user/csr-commitments`, { headers: this.getHeaders() });
    }

    // Admin — CSR commitments
    listAdminCsrCommitments(limit = 20, page = 1, status?: string): Observable<any> {
        let url = `${this.apiUrl}/admin/csr/commitments?limit=${limit}&page=${page}`;
        if (status) url += `&status=${encodeURIComponent(status)}`;
        return this.http.get(url, { headers: this.getHeaders(true) });
    }

    createAdminCsrCommitment(body: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/admin/csr/commitments`, body, { headers: this.getHeaders(true) });
    }

    getAdminCsrCommitment(id: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/admin/csr/commitments/${id}`, { headers: this.getHeaders(true) });
    }

    markAdminCsrTranchePaid(id: string, tid: string, donationId: string): Observable<any> {
        return this.http.patch(
            `${this.apiUrl}/admin/csr/commitments/${id}/tranches/${tid}/mark-paid`,
            { donationId },
            { headers: this.getHeaders(true) }
        );
    }

    resumeDonation(donationId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/donations/resume`, { donationId }, { headers: this.getHeaders() });
    }

    verifyPayment(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/donations/verify`, data, { headers: this.getHeaders() });
    }

    // --- Admin ---
    getAdminStats(): Observable<any> {
        return this.http.get(`${this.apiUrl}/admin/stats`, { headers: this.getHeaders(true) });
    }

    getAdminRegistrations(limit: number = 20, page: number = 1, userType?: string, search?: string): Observable<any> {
        let url = `${this.apiUrl}/admin/registrations?limit=${limit}&page=${page}`;
        if (userType) url += `&userType=${encodeURIComponent(userType)}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        return this.http.get(url, { headers: this.getHeaders(true) });
    }

    getAdminDonations(limit: number = 20, page: number = 1, status?: string, projectId?: string): Observable<any> {
        let url = `${this.apiUrl}/admin/donations?limit=${limit}&page=${page}`;
        if (status) url += `&status=${encodeURIComponent(status)}`;
        if (projectId) url += `&projectId=${encodeURIComponent(projectId)}`;
        return this.http.get(url, { headers: this.getHeaders(true) });
    }

    getLeaderboard(limit: number = 50, userType?: string): Observable<any> {
        let url = `${this.apiUrl}/admin/leaderboard?limit=${limit}`;
        if (userType) url += `&userType=${encodeURIComponent(userType)}`;
        return this.http.get(url, { headers: this.getHeaders(true) });
    }

    getAdminUserDetail(id: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/admin/users/${id}`, { headers: this.getHeaders(true) });
    }

    getAdminUserBySlug(slug: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/admin/users/by-slug/${slug}`, { headers: this.getHeaders(true) });
    }

    getAdminCertificates(limit: number = 20, page: number = 1, status?: string, type?: string): Observable<any> {
        let url = `${this.apiUrl}/admin/certificates?limit=${limit}&page=${page}`;
        if (status) url += `&status=${encodeURIComponent(status)}`;
        if (type) url += `&type=${encodeURIComponent(type)}`;
        return this.http.get(url, { headers: this.getHeaders(true) });
    }

    getAdminCorporateProfiles(limit: number = 20, page: number = 1, search?: string): Observable<any> {
        let url = `${this.apiUrl}/admin/corporate-profiles?limit=${limit}&page=${page}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        return this.http.get(url, { headers: this.getHeaders(true) });
    }

    updateCertificateStatus(id: string, status: string): Observable<any> {
        return this.http.patch(`${this.apiUrl}/admin/certificates/${id}`, { status }, { headers: this.getHeaders(true) });
    }

    regenerateCertificate(id: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/admin/certificates/${id}/regenerate`, {}, { headers: this.getHeaders(true) });
    }

    /** Trigger a download of the PDF cert via authenticated fetch (the route requires Bearer token). */
    downloadCertificateAsUser(id: string): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/user/certificates/${id}/download`, {
            headers: this.getHeaders(),
            responseType: 'blob'
        });
    }

    downloadCertificateAsAdmin(id: string): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/admin/certificates/${id}/download`, {
            headers: this.getHeaders(true),
            responseType: 'blob'
        });
    }

    // --- Admin: Organization Settings ---
    getOrgSettings(): Observable<any> {
        return this.http.get(`${this.apiUrl}/admin/settings`, { headers: this.getHeaders(true) });
    }

    updateOrgSettings(updates: Record<string, string | null>): Observable<any> {
        return this.http.put(`${this.apiUrl}/admin/settings`, updates, { headers: this.getHeaders(true) });
    }

    getOrgRequiredStatus(): Observable<any> {
        return this.http.get(`${this.apiUrl}/admin/settings/required-status`, { headers: this.getHeaders(true) });
    }

    uploadOrgSignatory(file: File): Observable<any> {
        const fd = new FormData();
        fd.append('image', file);
        const token = localStorage.getItem('adminToken') || '';
        const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
        return this.http.post(`${this.apiUrl}/admin/settings/upload/signatory`, fd, { headers });
    }

    uploadOrgLogo(file: File): Observable<any> {
        const fd = new FormData();
        fd.append('image', file);
        const token = localStorage.getItem('adminToken') || '';
        const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
        return this.http.post(`${this.apiUrl}/admin/settings/upload/logo`, fd, { headers });
    }

    exportCertificates(): string {
        return `${this.apiUrl}/admin/certificates/export`;
    }

    exportRegistrations(): string {
        const token = localStorage.getItem('adminToken') || '';
        return `${this.apiUrl}/admin/registrations/export`;
    }

    exportDonations(): string {
        const token = localStorage.getItem('adminToken') || '';
        return `${this.apiUrl}/admin/donations/export`;
    }

    getExportHeaders(): Record<string, string> {
        return { 'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}` };
    }
}
