import { createAxios } from 'slates';

export class Client {
  private api;

  constructor(private connectionToken: string) {
    this.api = createAxios({
      baseURL: 'https://printautopilot.com/api'
    });
  }

  private authHeaders(token?: string) {
    return {
      Authorization: `Bearer ${token || this.connectionToken}`
    };
  }

  async addDocumentToQueue(params: {
    printQueueToken: string;
    fileName: string;
    base64Content: string;
  }) {
    let response = await this.api.post(
      '/document/create',
      {
        fileName: params.fileName,
        base64: params.base64Content
      },
      {
        headers: this.authHeaders(params.printQueueToken)
      }
    );

    return response.data;
  }

  async getPrintJobs() {
    let response = await this.api.get('/print-jobs', {
      headers: {
        ...this.authHeaders(),
        Accept: 'application/json'
      }
    });

    return response.data;
  }
}
