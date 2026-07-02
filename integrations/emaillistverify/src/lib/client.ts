import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://apps.emaillistverify.com/api'
});

export interface VerifyEmailResult {
  status: string;
}

export interface EnrichEmailResult {
  fullName: string | null;
  gender: string | null;
  esp: string | null;
  free: boolean | null;
  noreply: boolean | null;
  status: string;
  email: string;
}

export interface FindEmailContact {
  email: string;
  confidence: string;
}

export interface BulkUploadResult {
  fileId: string;
}

export interface BulkFileStatus {
  fileId: string;
  filename: string;
  unique: string;
  lines: string;
  linesProcessed: string;
  status: string;
  timestamp: string;
  linkAll: string;
  linkOk: string;
}

export class Client {
  constructor(private config: { token: string }) {}

  async verifyEmail(email: string, timeout?: number): Promise<VerifyEmailResult> {
    let params: Record<string, string | number> = {
      secret: this.config.token,
      email
    };
    if (timeout !== undefined) {
      params.timeout = timeout;
    }

    let response = await http.get('/verifyEmail', { params });
    let status =
      typeof response.data === 'string' ? response.data.trim() : String(response.data).trim();

    return { status };
  }

  async verifyEmailDetailed(email: string, timeout?: number): Promise<EnrichEmailResult> {
    let params: Record<string, string | number> = {
      secret: this.config.token,
      email
    };
    if (timeout !== undefined) {
      params.timeout = timeout;
    }

    let response = await http.get('/verifyEmailDetailed', { params });
    let data = response.data;

    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return {
          email,
          status: data.trim(),
          fullName: null,
          gender: null,
          esp: null,
          free: null,
          noreply: null
        };
      }
    }

    return {
      email: data.email ?? email,
      status: data.status ?? 'unknown',
      fullName: data.fullName ?? data.full_name ?? null,
      gender: data.gender ?? null,
      esp: data.esp ?? data.ESP ?? null,
      free: data.free ?? null,
      noreply: data.noreply ?? data.no_reply ?? null
    };
  }

  async findEmail(params: {
    firstName?: string;
    lastName?: string;
    domain: string;
  }): Promise<FindEmailContact[]> {
    let response = await http.post('/find-contact', null, {
      params: {
        secret: this.config.token,
        first_name: params.firstName,
        last_name: params.lastName,
        domain: params.domain
      }
    });

    let data = response.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return [];
      }
    }

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item: any) => ({
      email: item.email ?? '',
      confidence: item.confidence ?? 'unknown'
    }));
  }

  async domainSearch(domain: string): Promise<FindEmailContact[]> {
    let response = await http.post('/find-contact', null, {
      params: {
        secret: this.config.token,
        domain
      }
    });

    let data = response.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return [];
      }
    }

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item: any) => ({
      email: item.email ?? '',
      confidence: item.confidence ?? 'unknown'
    }));
  }

  async uploadBulkFile(filename: string, fileContents: string): Promise<BulkUploadResult> {
    let formData = new FormData();
    let blob = new Blob([fileContents], { type: 'text/plain' });
    formData.append('file_contents', blob, filename);

    let response = await http.post('/verifApiFile', formData, {
      params: {
        secret: this.config.token,
        filename
      },
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    let data =
      typeof response.data === 'string' ? response.data.trim() : String(response.data).trim();

    if (data === 'no_credit') {
      throw new Error('Account balance is zero. Please add credits to continue.');
    }
    if (data === 'cannot_upload_file') {
      throw new Error('File upload failed due to incorrect formatting or broken upload.');
    }
    if (data === 'key_not_valid') {
      throw new Error('Invalid API key provided.');
    }
    if (data === 'missing parameters') {
      throw new Error('Missing required parameters for the request.');
    }

    return { fileId: data };
  }

  async getBulkFileStatus(fileId: string): Promise<BulkFileStatus> {
    let response = await http.get('/getApiFileInfo', {
      params: {
        secret: this.config.token,
        id: fileId
      }
    });

    let data =
      typeof response.data === 'string' ? response.data.trim() : String(response.data).trim();

    if (data === 'error_file_not_exists') {
      throw new Error('File does not exist under your account.');
    }
    if (data === 'key_not_valid') {
      throw new Error('Invalid API key provided.');
    }
    if (data === 'missing parameters') {
      throw new Error('Missing required parameters for the request.');
    }

    let parts = data.split('|');

    return {
      fileId: parts[0] ?? '',
      filename: parts[1] ?? '',
      unique: parts[2] ?? '',
      lines: parts[3] ?? '0',
      linesProcessed: parts[4] ?? '0',
      status: parts[5] ?? 'unknown',
      timestamp: parts[6] ?? '',
      linkAll: parts[7] ?? '',
      linkOk: parts[8] ?? ''
    };
  }
}
