import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment';

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

    sendOtp(email: string, purpose: string = 'register'): Observable<any> {
        return this.http.post(`${this.apiUrl}/auth/send-otp`, { email, purpose });
    }

    verifyOtp(email: string, otp: string, purpose: string = 'register'): Observable<any> {
        return this.http.post(`${this.apiUrl}/auth/verify-otp`, { email, otp, purpose });
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

    requestCertificate(panNumber: string, donationId?: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/user/certificate-request`, { panNumber, donationId }, { headers: this.getHeaders() });
    }

    getCertificateRequests(): Observable<any> {
        return this.http.get(`${this.apiUrl}/user/certificate-requests`, { headers: this.getHeaders() });
    }

    // --- Donations ---
    createOrder(amount: number, request80g: boolean = false): Observable<any> {
        return this.http.post(`${this.apiUrl}/donations/create-order`, { amount, request80g }, { headers: this.getHeaders() });
    }

    verifyPayment(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/donations/verify`, data, { headers: this.getHeaders() });
    }

    // --- Admin ---
    getAdminStats(): Observable<any> {
        return this.http.get(`${this.apiUrl}/admin/stats`, { headers: this.getHeaders(true) });
    }

    getAdminRegistrations(limit: number = 50, userType?: string, search?: string): Observable<any> {
        let url = `${this.apiUrl}/admin/registrations?limit=${limit}`;
        if (userType) url += `&userType=${userType}`;
        if (search) url += `&search=${search}`;
        return this.http.get(url, { headers: this.getHeaders(true) });
    }

    getAdminDonations(limit: number = 50, status?: string): Observable<any> {
        let url = `${this.apiUrl}/admin/donations?limit=${limit}`;
        if (status) url += `&status=${status}`;
        return this.http.get(url, { headers: this.getHeaders(true) });
    }

    getLeaderboard(limit: number = 50, userType?: string): Observable<any> {
        let url = `${this.apiUrl}/admin/leaderboard?limit=${limit}`;
        if (userType) url += `&userType=${userType}`;
        return this.http.get(url, { headers: this.getHeaders(true) });
    }

    getAdminUserDetail(id: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/admin/users/${id}`, { headers: this.getHeaders(true) });
    }

    getAdminUserBySlug(slug: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/admin/users/by-slug/${slug}`, { headers: this.getHeaders(true) });
    }

    getAdminCertificates(limit: number = 20, status?: string): Observable<any> {
        let url = `${this.apiUrl}/admin/certificates?limit=${limit}`;
        if (status) url += `&status=${status}`;
        return this.http.get(url, { headers: this.getHeaders(true) });
    }

    updateCertificateStatus(id: string, status: string): Observable<any> {
        return this.http.patch(`${this.apiUrl}/admin/certificates/${id}`, { status }, { headers: this.getHeaders(true) });
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
