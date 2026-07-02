import { createAxios } from 'slates';

let BASE_URL = 'https://api.documint.me/1';

export interface DocumentMergeOptions {
  templateId: string;
  variables: Record<string, unknown>;
  preview?: boolean;
}

export class DocumintClient {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        api_key: token,
        'Content-Type': 'application/json'
      }
    });
  }

  async listTemplates(page?: number): Promise<Record<string, unknown>[]> {
    let response = await this.axios.get('/templates', {
      params: page != null ? { page } : undefined
    });
    return response.data;
  }

  async createDocument(options: DocumentMergeOptions): Promise<Record<string, unknown>> {
    let { templateId, variables, preview } = options;
    let response = await this.axios.post(`/templates/${templateId}/content`, variables, {
      params: {
        active: true,
        ...(preview != null ? { preview } : {})
      }
    });
    return response.data;
  }
}
