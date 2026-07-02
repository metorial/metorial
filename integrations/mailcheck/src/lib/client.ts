import { createAxios } from 'slates';

export interface VerificationResult {
  email: string;
  trustRate: number;
  mxExists: boolean;
  smtpExists: boolean;
  isNotSmtpCatchAll: boolean;
  isNotDisposable: boolean;
  gravatar?: {
    entries?: Array<{
      profileUrl?: string;
      preferredUsername?: string;
      accounts?: Array<{
        domain?: string;
        shortname?: string;
        username?: string;
        userid?: string;
        url?: string;
        verified?: string;
      }>;
    }>;
  };
  githubUsername?: string;
  facebook?: {
    id?: string;
    name?: string;
  };
}

export interface OperationMetadata {
  totalCount?: number;
  processedCount?: number;
  freeLimitReached?: boolean;
  createTime?: string;
}

export interface OperationResult {
  code?: number;
  message?: string;
  response?: {
    url?: string;
  };
}

export interface Operation {
  name: string;
  done: boolean;
  metadata?: OperationMetadata;
  result?: OperationResult;
}

export interface ListOperationsResponse {
  operations: Operation[];
  nextPageToken?: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.mailcheck.co/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async verifySingleEmail(email: string): Promise<VerificationResult> {
    let response = await this.axios.post('/singleEmail:check', { email });
    return response.data;
  }

  async createBatchCheck(emails: string[]): Promise<Operation> {
    let response = await this.axios.post('/emails:check', { emails });
    return response.data;
  }

  async listOperations(params?: {
    pageSize?: number;
    pageToken?: string;
  }): Promise<ListOperationsResponse> {
    let response = await this.axios.get('/emails/operations', {
      params: {
        page_size: params?.pageSize,
        page_token: params?.pageToken
      }
    });
    return response.data;
  }

  async getOperationStatus(operationName: string): Promise<Operation> {
    let response = await this.axios.get(`/emails/${operationName}`);
    return response.data;
  }
}
