import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  requestAxiosData
} from 'slates';

let LEVERLY_BASE_URL = 'https://app.leverly.com';

export interface CreateCallParams {
  phone: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  parameter1?: string;
  parameter2?: string;
  address?: string;
  country?: string;
  city?: string;
  state?: string;
  zip?: string;
  leadSource?: string;
  leadInterest?: string;
  company?: string;
  keywords?: string;
  comments?: string;
  vendorLeadId?: string;
  callDelay?: number;
  groupId?: string;
}

export interface StopReattemptsParams {
  phone: string;
}

export class LeverlyClient {
  private axios: ReturnType<typeof createAxios>;
  private accountId: string;

  constructor(config: { username: string; token: string; accountId: string }) {
    if (!config.accountId.trim()) {
      throw createApiServiceError(
        'A Leverly account ID is required. Reconnect with your account ID.'
      );
    }

    this.accountId = config.accountId;
    this.axios = createAxios({
      baseURL: LEVERLY_BASE_URL,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  }

  async createCall(params: CreateCallParams): Promise<unknown> {
    if (!params.phone.trim()) {
      throw createApiServiceError('A lead phone number is required to submit a call.');
    }

    let formData = new URLSearchParams();

    formData.append('Phone1', params.phone);

    if (params.firstName) formData.append('firstName', params.firstName);
    if (params.lastName) formData.append('lastName', params.lastName);
    if (params.email) formData.append('email', params.email);
    if (params.parameter1) formData.append('parameter1', params.parameter1);
    if (params.parameter2) formData.append('parameter2', params.parameter2);
    if (params.address) formData.append('address', params.address);
    if (params.country) formData.append('country', params.country);
    if (params.city) formData.append('city', params.city);
    if (params.state) formData.append('state', params.state);
    if (params.zip) formData.append('zip', params.zip);
    if (params.leadSource) formData.append('leadSource', params.leadSource);
    if (params.leadInterest) formData.append('leadInterest', params.leadInterest);
    if (params.company) formData.append('company', params.company);
    if (params.keywords) formData.append('keywords', params.keywords);
    if (params.comments) formData.append('comments', params.comments);
    if (params.vendorLeadId) formData.append('vendorLeadId', params.vendorLeadId);
    if (params.callDelay !== undefined) formData.append('callDelay', String(params.callDelay));
    if (params.groupId) formData.append('groupId', params.groupId);

    return this.submitLead(formData, 'create call');
  }

  async stopReattempts(params: StopReattemptsParams): Promise<unknown> {
    if (!params.phone.trim()) {
      throw createApiServiceError('A lead phone number is required to stop call reattempts.');
    }

    let formData = new URLSearchParams();
    formData.append('Phone1', params.phone);
    formData.append('stopReattempts', '1');

    return this.submitLead(formData, 'stop call reattempts');
  }

  private async submitLead(formData: URLSearchParams, operation: string) {
    return requestAxiosData(
      operation,
      () =>
        this.axios.post<unknown>('/main/ingestor/process', formData.toString(), {
          params: { AccountID: this.accountId }
        }),
      (error, failedOperation) =>
        buildApiServiceError(error, {
          providerLabel: 'Leverly',
          reason: 'leverly_api_error',
          operation: failedOperation
        })
    );
  }
}
