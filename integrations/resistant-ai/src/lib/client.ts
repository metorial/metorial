import { createAxios } from 'slates';

let BASE_URL = 'https://api-dot-stackgo-300922.ts.r.appspot.com/api';

export interface VerificationRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  verificationType?: 'biometric' | 'document_only';
  callbackUrl?: string;
  referenceId?: string;
}

export interface AmlScreeningRequest {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  screeningTypes?: Array<'pep' | 'sanctions' | 'adverse_media'>;
  referenceId?: string;
}

export interface ProofOfAddressRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  referenceId?: string;
}

export interface BackgroundCheckRequest {
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  referenceId?: string;
}

export interface CreditCheckRequest {
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  checkType?: 'report' | 'score' | 'risk_alert';
  referenceId?: string;
}

export interface KybRequest {
  companyName: string;
  registrationNumber?: string;
  country?: string;
  reportType?: 'kyb' | 'ubo' | 'asic_director';
  referenceId?: string;
}

export interface ListParams {
  page?: number;
  limit?: number;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

export class IdentityCheckClient {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // --- Identity Verification ---

  async createVerification(request: VerificationRequest): Promise<Record<string, any>> {
    let response = await this.http.post('/identitycheck/verifications', {
      email: request.email,
      first_name: request.firstName,
      last_name: request.lastName,
      verification_type: request.verificationType || 'biometric',
      callback_url: request.callbackUrl,
      reference_id: request.referenceId
    });
    return response.data;
  }

  async getVerification(verificationId: string): Promise<Record<string, any>> {
    let response = await this.http.get(`/identitycheck/verifications/${verificationId}`);
    return response.data;
  }

  async listVerifications(params?: ListParams): Promise<Record<string, any>> {
    let response = await this.http.get('/identitycheck/verifications', {
      params: {
        page: params?.page,
        limit: params?.limit,
        status: params?.status,
        from_date: params?.fromDate,
        to_date: params?.toDate
      }
    });
    return response.data;
  }

  async cancelVerification(verificationId: string): Promise<Record<string, any>> {
    let response = await this.http.post(
      `/identitycheck/verifications/${verificationId}/cancel`
    );
    return response.data;
  }

  async resendVerificationEmail(verificationId: string): Promise<Record<string, any>> {
    let response = await this.http.post(
      `/identitycheck/verifications/${verificationId}/resend`
    );
    return response.data;
  }

  // --- AML Screening ---

  async createAmlScreening(request: AmlScreeningRequest): Promise<Record<string, any>> {
    let response = await this.http.post('/identitycheck/aml/screenings', {
      first_name: request.firstName,
      last_name: request.lastName,
      date_of_birth: request.dateOfBirth,
      screening_types: request.screeningTypes || ['pep', 'sanctions', 'adverse_media'],
      reference_id: request.referenceId
    });
    return response.data;
  }

  async getAmlScreening(screeningId: string): Promise<Record<string, any>> {
    let response = await this.http.get(`/identitycheck/aml/screenings/${screeningId}`);
    return response.data;
  }

  async listAmlScreenings(params?: ListParams): Promise<Record<string, any>> {
    let response = await this.http.get('/identitycheck/aml/screenings', {
      params: {
        page: params?.page,
        limit: params?.limit,
        status: params?.status,
        from_date: params?.fromDate,
        to_date: params?.toDate
      }
    });
    return response.data;
  }

  // --- Proof of Address ---

  async createProofOfAddress(request: ProofOfAddressRequest): Promise<Record<string, any>> {
    let response = await this.http.post('/identitycheck/proof-of-address', {
      email: request.email,
      first_name: request.firstName,
      last_name: request.lastName,
      reference_id: request.referenceId
    });
    return response.data;
  }

  async getProofOfAddress(checkId: string): Promise<Record<string, any>> {
    let response = await this.http.get(`/identitycheck/proof-of-address/${checkId}`);
    return response.data;
  }

  // --- Background Checks (US) ---

  async createBackgroundCheck(request: BackgroundCheckRequest): Promise<Record<string, any>> {
    let response = await this.http.post('/identitycheck/background-checks', {
      email: request.email,
      first_name: request.firstName,
      last_name: request.lastName,
      date_of_birth: request.dateOfBirth,
      reference_id: request.referenceId
    });
    return response.data;
  }

  async getBackgroundCheck(checkId: string): Promise<Record<string, any>> {
    let response = await this.http.get(`/identitycheck/background-checks/${checkId}`);
    return response.data;
  }

  // --- Credit Checks ---

  async createCreditCheck(request: CreditCheckRequest): Promise<Record<string, any>> {
    let response = await this.http.post('/identitycheck/credit-checks', {
      email: request.email,
      first_name: request.firstName,
      last_name: request.lastName,
      date_of_birth: request.dateOfBirth,
      check_type: request.checkType || 'report',
      reference_id: request.referenceId
    });
    return response.data;
  }

  async getCreditCheck(checkId: string): Promise<Record<string, any>> {
    let response = await this.http.get(`/identitycheck/credit-checks/${checkId}`);
    return response.data;
  }

  // --- Know Your Business (KYB) ---

  async createKybReport(request: KybRequest): Promise<Record<string, any>> {
    let response = await this.http.post('/identitycheck/kyb/reports', {
      company_name: request.companyName,
      registration_number: request.registrationNumber,
      country: request.country,
      report_type: request.reportType || 'kyb',
      reference_id: request.referenceId
    });
    return response.data;
  }

  async getKybReport(reportId: string): Promise<Record<string, any>> {
    let response = await this.http.get(`/identitycheck/kyb/reports/${reportId}`);
    return response.data;
  }

  async listKybReports(params?: ListParams): Promise<Record<string, any>> {
    let response = await this.http.get('/identitycheck/kyb/reports', {
      params: {
        page: params?.page,
        limit: params?.limit,
        status: params?.status,
        from_date: params?.fromDate,
        to_date: params?.toDate
      }
    });
    return response.data;
  }

  // --- Webhooks ---

  async registerWebhook(url: string, events: string[]): Promise<Record<string, any>> {
    let response = await this.http.post('/identitycheck/webhooks', {
      url,
      events
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.http.delete(`/identitycheck/webhooks/${webhookId}`);
  }
}
