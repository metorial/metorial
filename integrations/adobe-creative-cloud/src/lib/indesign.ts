import { type AdobeAuthConfig, createAdobeAxios } from './client';

let INDESIGN_BASE_URL = 'https://indesign.adobe.io';

export class InDesignClient {
  private http;

  constructor(auth: AdobeAuthConfig) {
    this.http = createAdobeAxios(INDESIGN_BASE_URL, auth);
  }

  async dataMerge(params: {
    templateSource: { href: string; storage: string };
    dataSource: { href: string; storage: string };
    output: { href: string; storage: string; type: 'pdf' | 'jpeg' | 'png' | 'indd' };
    options?: {
      multipleRecords?: boolean;
      recordRange?: string;
    };
  }) {
    let response = await this.http.post('/api/v1/capability/datamerge', {
      assets: [
        {
          source: params.templateSource,
          type: 'template'
        },
        {
          source: params.dataSource,
          type: 'data'
        }
      ],
      outputs: [
        {
          ...params.output
        }
      ],
      params: {
        ...(params.options || {})
      }
    });
    return response.data;
  }

  async exportPdf(params: {
    source: { href: string; storage: string };
    output: { href: string; storage: string };
    options?: {
      pdfPreset?: string;
    };
  }) {
    let response = await this.http.post('/api/v1/capability/pdf/create', {
      assets: [
        {
          source: params.source
        }
      ],
      outputs: [params.output],
      params: {
        ...(params.options || {})
      }
    });
    return response.data;
  }

  async getJobStatus(jobUrl: string) {
    let response = await this.http.get(jobUrl);
    return response.data;
  }
}
