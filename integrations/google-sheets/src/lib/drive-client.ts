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

  async deleteFile(fileId: string) {
    await this.axios.delete(`/files/${fileId}`);
  }
}
