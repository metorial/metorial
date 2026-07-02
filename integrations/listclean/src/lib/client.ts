import { createAxios } from 'slates';

let BASE_URL = 'https://api.listclean.xyz/v1';

export interface VerificationResult {
  email: string;
  status: string;
  remarks: string;
}

export interface AccountProfile {
  id: string;
  email: string;
  name: string;
  credits: number;
  [key: string]: unknown;
}

export interface BulkList {
  listId: string;
  fileName: string;
  status: string;
  totalEmails: number;
  cleanCount: number;
  dirtyCount: number;
  unknownCount: number;
  createdAt: string;
  [key: string]: unknown;
}

export interface BulkUploadResult {
  listId: string;
  fileName: string;
  status: string;
  totalEmails: number;
  [key: string]: unknown;
}

export class ListcleanClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(opts: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'X-Auth-Token': opts.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async verifyEmail(email: string): Promise<VerificationResult> {
    let res = await this.axios.get(`/verify/email/${encodeURIComponent(email)}`);
    return res.data;
  }

  async getAccountProfile(): Promise<AccountProfile> {
    let res = await this.axios.get('/account/profile/');
    return res.data;
  }

  async uploadBulkList(
    fileName: string,
    fileContent: string,
    fileType: 'csv' | 'txt'
  ): Promise<BulkUploadResult> {
    let formData = new FormData();
    let blob = new Blob([fileContent], {
      type: fileType === 'csv' ? 'text/csv' : 'text/plain'
    });
    formData.append('file', blob, fileName);

    let res = await this.axios.post('/bulk/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  }

  async getBulkListStatus(listId: string): Promise<BulkList> {
    let res = await this.axios.get(`/bulk/list/${encodeURIComponent(listId)}/`);
    return res.data;
  }

  async getBulkLists(): Promise<BulkList[]> {
    let res = await this.axios.get('/bulk/lists/');
    return res.data?.results || res.data || [];
  }

  async downloadBulkResults(
    listId: string,
    filter: 'all' | 'clean' | 'dirty' = 'all'
  ): Promise<string> {
    let filterParam = filter === 'clean' ? 'ok' : filter === 'dirty' ? 'bad' : 'all';
    let res = await this.axios.get(`/bulk/list/${encodeURIComponent(listId)}/download/`, {
      params: { filter: filterParam },
      responseType: 'text'
    });
    return res.data;
  }
}
