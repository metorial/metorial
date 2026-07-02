import { createAxios } from 'slates';

export interface MigrationApiConfig {
  repositoryName: string;
  migrationToken: string;
}

export interface MigrationDocument {
  title: string;
  type: string;
  uid?: string;
  lang?: string;
  tags?: string[];
  alternate_language_id?: string;
  data: Record<string, any>;
}

export interface MigrationDocumentResponse {
  title: string;
  id: string;
  type: string;
  lang: string;
  uid?: string;
}

export class MigrationApiClient {
  private repositoryName: string;
  private migrationToken: string;

  constructor(config: MigrationApiConfig) {
    this.repositoryName = config.repositoryName;
    this.migrationToken = config.migrationToken;
  }

  private getAxios() {
    return createAxios({
      baseURL: 'https://migration.prismic.io',
      headers: {
        Authorization: `Bearer ${this.migrationToken}`,
        'x-api-key': this.migrationToken,
        repository: this.repositoryName,
        'Content-Type': 'application/json'
      }
    });
  }

  async createDocument(document: MigrationDocument): Promise<MigrationDocumentResponse> {
    let axios = this.getAxios();
    let response = await axios.post('/documents', document);
    return response.data as MigrationDocumentResponse;
  }

  async updateDocument(
    documentId: string,
    document: MigrationDocument
  ): Promise<MigrationDocumentResponse> {
    let axios = this.getAxios();
    let response = await axios.put(`/documents/${documentId}`, document);
    return response.data as MigrationDocumentResponse;
  }
}
