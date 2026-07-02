import { createAxios } from 'slates';

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

  async watchFile(fileId: string, webhookUrl: string, channelId: string, expiration?: number) {
    let body: Record<string, any> = {
      id: channelId,
      type: 'web_hook',
      address: webhookUrl
    };

    if (expiration) {
      body.expiration = expiration;
    }

    let response = await this.axios.post(`/files/${fileId}/watch`, body);
    return response.data;
  }

  async stopChannel(channelId: string, resourceId: string) {
    await this.axios.post('/channels/stop', {
      id: channelId,
      resourceId
    });
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
