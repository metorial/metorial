import { createAxios } from 'slates';

export interface DriveSpreadsheetFile {
  id: string;
  modifiedTime: string;
  lastModifyingUser?: { emailAddress?: string; displayName?: string };
}

export class DriveClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://www.googleapis.com/drive/v3',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  async listModifiedSpreadsheets(since: string, pageToken?: string) {
    let response = await this.axios.get('/files', {
      params: {
        q: `mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false and modifiedTime > '${since}'`,
        fields:
          'nextPageToken,files(id,modifiedTime,lastModifyingUser(emailAddress,displayName))',
        pageSize: 1000,
        pageToken
      }
    });
    return response.data as {
      files?: DriveSpreadsheetFile[];
      nextPageToken?: string;
    };
  }

  async getFile(fileId: string, fields?: string) {
    let response = await this.axios.get(`/files/${fileId}`, {
      params: { fields: fields ?? 'id,name,mimeType,modifiedTime,lastModifyingUser' }
    });
    return response.data;
  }

  async deleteFile(fileId: string) {
    await this.axios.delete(`/files/${fileId}`);
  }
}
