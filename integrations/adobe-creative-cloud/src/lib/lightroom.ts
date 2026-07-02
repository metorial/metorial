import { type AdobeAuthConfig, createAdobeAxios } from './client';

let LIGHTROOM_BASE_URL = 'https://lr.adobe.io';
let LIGHTROOM_EDIT_BASE_URL = 'https://image.adobe.io';

export class LightroomClient {
  private http;
  private editHttp;

  constructor(auth: AdobeAuthConfig) {
    this.http = createAdobeAxios(LIGHTROOM_BASE_URL, auth);
    this.editHttp = createAdobeAxios(LIGHTROOM_EDIT_BASE_URL, auth);
  }

  async getCatalog() {
    let response = await this.http.get('/v2/catalog');
    return response.data;
  }

  async listAssets(
    catalogId: string,
    params?: {
      limit?: number;
      capturedAfter?: string;
      capturedBefore?: string;
      subtype?: string;
    }
  ) {
    let response = await this.http.get(`/v2/catalogs/${catalogId}/assets`, {
      params: {
        limit: params?.limit || 50,
        ...(params?.capturedAfter ? { captured_after: params.capturedAfter } : {}),
        ...(params?.capturedBefore ? { captured_before: params.capturedBefore } : {}),
        ...(params?.subtype ? { subtype: params.subtype } : {})
      }
    });
    return response.data;
  }

  async getAsset(catalogId: string, assetId: string) {
    let response = await this.http.get(`/v2/catalogs/${catalogId}/assets/${assetId}`);
    return response.data;
  }

  async listAlbums(catalogId: string, params?: { limit?: number }) {
    let response = await this.http.get(`/v2/catalogs/${catalogId}/albums`, {
      params: {
        limit: params?.limit || 50
      }
    });
    return response.data;
  }

  async getAlbum(catalogId: string, albumId: string) {
    let response = await this.http.get(`/v2/catalogs/${catalogId}/albums/${albumId}`);
    return response.data;
  }

  async createAlbum(catalogId: string, albumId: string, name: string, parentAlbumId?: string) {
    let payload: any = {
      subtype: 'album',
      payload: {
        name,
        userCreated: new Date().toISOString(),
        userUpdated: new Date().toISOString()
      }
    };
    if (parentAlbumId) {
      payload.payload.parent = { id: parentAlbumId };
    }
    let response = await this.http.put(`/v2/catalogs/${catalogId}/albums/${albumId}`, payload);
    return response.data;
  }

  async listAlbumAssets(catalogId: string, albumId: string, params?: { limit?: number }) {
    let response = await this.http.get(`/v2/catalogs/${catalogId}/albums/${albumId}/assets`, {
      params: {
        limit: params?.limit || 50
      }
    });
    return response.data;
  }

  async addAssetsToAlbum(catalogId: string, albumId: string, assetIds: string[]) {
    let resources: any = {};
    for (let id of assetIds) {
      resources[id] = {};
    }
    let response = await this.http.put(`/v2/catalogs/${catalogId}/albums/${albumId}/assets`, {
      resources
    });
    return response.data;
  }

  async getAssetRendition(catalogId: string, assetId: string, renditionType: string) {
    let response = await this.http.get(
      `/v2/catalogs/${catalogId}/assets/${assetId}/renditions/${renditionType}`,
      { responseType: 'arraybuffer' }
    );
    return response.data;
  }

  async applyPreset(
    input: { href: string; storage: string },
    output: { href: string; storage: string },
    presetXmp: string
  ) {
    let response = await this.editHttp.post('/lrService/presets', {
      inputs: input,
      outputs: [output],
      options: {
        presets: [
          {
            presetXmp
          }
        ]
      }
    });
    return response.data;
  }

  async autoTone(
    input: { href: string; storage: string },
    output: { href: string; storage: string }
  ) {
    let response = await this.editHttp.post('/lrService/autoTone', {
      inputs: input,
      outputs: [output]
    });
    return response.data;
  }

  async applyEdits(
    input: { href: string; storage: string },
    output: { href: string; storage: string },
    settings: Record<string, any>
  ) {
    let response = await this.editHttp.post('/lrService/edit', {
      inputs: input,
      outputs: [output],
      options: settings
    });
    return response.data;
  }
}
