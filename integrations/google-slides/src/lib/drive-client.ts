import { createAxios } from 'slates';

let BASE_URL = 'https://www.googleapis.com/drive/v3';

export class DriveClient {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  async listPresentations(options?: {
    pageSize?: number;
    pageToken?: string;
    orderBy?: string;
    modifiedAfter?: string;
  }): Promise<any> {
    let query = "mimeType='application/vnd.google-apps.presentation'";

    if (options?.modifiedAfter) {
      query += ` and modifiedTime > '${options.modifiedAfter}'`;
    }

    let params: any = {
      q: query,
      pageSize: options?.pageSize || 50,
      fields:
        'nextPageToken,files(id,name,createdTime,modifiedTime,owners,lastModifyingUser,webViewLink,thumbnailLink)',
      orderBy: options?.orderBy || 'modifiedTime desc'
    };

    if (options?.pageToken) {
      params.pageToken = options.pageToken;
    }

    let response = await this.http.get('/files', { params });
    return response.data;
  }

  async getFileRevisions(fileId: string, pageSize?: number): Promise<any> {
    let response = await this.http.get(`/files/${fileId}/revisions`, {
      params: {
        pageSize: pageSize || 10,
        fields: 'revisions(id,modifiedTime,lastModifyingUser)'
      }
    });
    return response.data;
  }
}
