import { createAxios } from 'slates';

export class UploadClient {
  private publicKey: string;

  constructor(publicKey: string) {
    this.publicKey = publicKey;
  }

  private getAxios() {
    return createAxios({
      baseURL: 'https://upload.uploadcare.com/'
    });
  }

  async uploadFromUrl(params: {
    sourceUrl: string;
    store?: string;
    filename?: string;
    checkUrlDuplicates?: boolean;
    saveUrlDuplicates?: boolean;
    metadata?: Record<string, string>;
  }): Promise<{ token: string }> {
    let axios = this.getAxios();
    let body: Record<string, any> = {
      pub_key: this.publicKey,
      source_url: params.sourceUrl
    };
    if (params.store !== undefined) body.store = params.store;
    if (params.filename !== undefined) body.filename = params.filename;
    if (params.checkUrlDuplicates !== undefined)
      body.check_URL_duplicates = params.checkUrlDuplicates ? '1' : '0';
    if (params.saveUrlDuplicates !== undefined)
      body.save_URL_duplicates = params.saveUrlDuplicates ? '1' : '0';
    if (params.metadata) {
      for (let [key, value] of Object.entries(params.metadata)) {
        body[`metadata[${key}]`] = value;
      }
    }

    let response = await axios.post('/from_url/', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async getUrlUploadStatus(token: string): Promise<{
    status: string;
    uuid?: string;
    file_id?: string;
    filename?: string;
    size?: number;
    total?: number;
    done?: number;
    is_stored?: boolean;
    is_image?: boolean;
    mime_type?: string;
    error?: string;
    original_filename?: string;
  }> {
    let axios = this.getAxios();
    let response = await axios.get('/from_url/status/', {
      params: { token }
    });
    return response.data;
  }

  async createGroup(fileIds: string[]): Promise<{
    id: string;
    datetime_created: string;
    files_count: number;
    cdn_url: string;
    url: string;
    files: any[];
  }> {
    let axios = this.getAxios();
    let params = new URLSearchParams();
    params.append('pub_key', this.publicKey);
    for (let fileId of fileIds) {
      params.append('files[]', fileId);
    }

    let response = await axios.post('/group/', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }
}
