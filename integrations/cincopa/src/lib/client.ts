import { createAxios } from 'slates';

let axios = createAxios({
  baseURL: 'https://api.cincopa.com/v2'
});

export class CincopaClient {
  private apiToken: string;

  constructor(config: { token: string }) {
    this.apiToken = config.token;
  }

  private params(extra: Record<string, unknown> = {}): Record<string, unknown> {
    let result: Record<string, unknown> = { api_token: this.apiToken };
    for (let [key, value] of Object.entries(extra)) {
      if (value !== undefined && value !== null && value !== '') {
        result[key] = value;
      }
    }
    return result;
  }

  // ─── General ────────────────────────────────────────

  async ping(): Promise<any> {
    let response = await axios.get('/ping.json', { params: this.params() });
    return response.data;
  }

  // ─── Gallery Methods ────────────────────────────────

  async listGalleries(options?: { page?: number; pageSize?: number }): Promise<any> {
    let response = await axios.get('/gallery.list.json', {
      params: this.params({
        page: options?.page,
        page_size: options?.pageSize
      })
    });
    return response.data;
  }

  async createGallery(options: {
    name?: string;
    description?: string;
    template?: string;
    copyArgs?: string;
    master?: string;
    copyItems?: string;
  }): Promise<any> {
    let response = await axios.get('/gallery.create.json', {
      params: this.params({
        name: options.name,
        description: options.description,
        template: options.template,
        copy_args: options.copyArgs,
        master: options.master,
        copy_items: options.copyItems
      })
    });
    return response.data;
  }

  async updateGallery(options: {
    galleryId: string;
    name?: string;
    description?: string;
    template?: string;
  }): Promise<any> {
    let response = await axios.get('/gallery.update.json', {
      params: this.params({
        fid: options.galleryId,
        name: options.name,
        description: options.description,
        template: options.template
      })
    });
    return response.data;
  }

  async deleteGallery(options: { galleryId: string; deleteAssets?: boolean }): Promise<any> {
    let response = await axios.get('/gallery.delete.json', {
      params: this.params({
        fid: options.galleryId,
        delete_assets: options.deleteAssets ? 'yes' : 'no'
      })
    });
    return response.data;
  }

  async getGalleryItems(options: {
    galleryId: string;
    page?: number;
    pageSize?: number;
  }): Promise<any> {
    let response = await axios.get('/gallery.get_items.json', {
      params: this.params({
        fid: options.galleryId,
        page: options.page,
        page_size: options.pageSize
      })
    });
    return response.data;
  }

  async addItemToGallery(options: {
    galleryId: string;
    rid: string;
    insertPosition?: string;
  }): Promise<any> {
    let response = await axios.get('/gallery.add_item.json', {
      params: this.params({
        fid: options.galleryId,
        rid: options.rid,
        insert_position: options.insertPosition
      })
    });
    return response.data;
  }

  async removeItemFromGallery(options: {
    galleryId: string;
    rid: string;
    deleteAsset?: boolean;
  }): Promise<any> {
    let response = await axios.get('/gallery.remove_item.json', {
      params: this.params({
        fid: options.galleryId,
        rid: options.rid,
        delete_asset: options.deleteAsset ? 'yes' : 'no'
      })
    });
    return response.data;
  }

  async setGalleryMaster(options: { galleryId: string; rid: string }): Promise<any> {
    let response = await axios.get('/gallery.set_master.json', {
      params: this.params({
        fid: options.galleryId,
        rid: options.rid
      })
    });
    return response.data;
  }

  async zipGallery(galleryId: string): Promise<any> {
    let response = await axios.get('/gallery.zip.json', {
      params: this.params({ fid: galleryId })
    });
    return response.data;
  }

  // ─── Asset Methods ──────────────────────────────────

  async listAssets(options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    referenceId?: string;
    type?: string;
  }): Promise<any> {
    let response = await axios.get('/asset.list.json', {
      params: this.params({
        page: options?.page,
        page_size: options?.pageSize,
        search: options?.search,
        reference_id: options?.referenceId,
        type: options?.type
      })
    });
    return response.data;
  }

  async setAssetMetadata(options: {
    rid: string;
    title?: string;
    description?: string;
    referenceId?: string;
    fileName?: string;
  }): Promise<any> {
    let response = await axios.get('/asset.set.json', {
      params: this.params({
        rid: options.rid,
        title: options.title,
        description: options.description,
        reference_id: options.referenceId,
        filename: options.fileName
      })
    });
    return response.data;
  }

  async deleteAsset(rid: string): Promise<any> {
    let response = await axios.get('/asset.delete.json', {
      params: this.params({ rid })
    });
    return response.data;
  }

  async getAssetTags(): Promise<any> {
    let response = await axios.get('/asset.get_tags.json', {
      params: this.params()
    });
    return response.data;
  }

  async resyncAsset(rid: string): Promise<any> {
    let response = await axios.get('/asset.resync.json', {
      params: this.params({ rid })
    });
    return response.data;
  }

  // ─── Upload Methods ─────────────────────────────────

  async getUploadUrl(options?: {
    galleryId?: string;
    rid?: string;
    type?: string;
  }): Promise<any> {
    let response = await axios.get('/asset.get_upload_url.json', {
      params: this.params({
        fid: options?.galleryId,
        rid: options?.rid,
        type: options?.type
      })
    });
    return response.data;
  }

  async uploadFromUrl(options: {
    url: string;
    galleryId?: string;
    rid?: string;
    type?: string;
    title?: string;
    description?: string;
  }): Promise<any> {
    let response = await axios.get('/asset.upload_from_url.json', {
      params: this.params({
        url: options.url,
        fid: options.galleryId,
        rid: options.rid,
        type: options.type,
        title: options.title,
        description: options.description
      })
    });
    return response.data;
  }

  async getUploadFromUrlStatus(statusId: string): Promise<any> {
    let response = await axios.get('/asset.upload_from_url_get_status.json', {
      params: this.params({ status_id: statusId })
    });
    return response.data;
  }

  // ─── Portal Methods ─────────────────────────────────

  async listPortals(): Promise<any> {
    let response = await axios.get('/portal.list.json', {
      params: this.params()
    });
    return response.data;
  }

  async createPortal(options: { name: string; description?: string }): Promise<any> {
    let response = await axios.get('/portal.create.json', {
      params: this.params({
        name: options.name,
        description: options.description
      })
    });
    return response.data;
  }

  async updatePortal(options: {
    portalId: string;
    name?: string;
    description?: string;
  }): Promise<any> {
    let response = await axios.get('/portal.update.json', {
      params: this.params({
        portal_id: options.portalId,
        name: options.name,
        description: options.description
      })
    });
    return response.data;
  }

  async deletePortal(portalId: string): Promise<any> {
    let response = await axios.get('/portal.remove.json', {
      params: this.params({ portal_id: portalId })
    });
    return response.data;
  }

  async deactivatePortal(portalId: string): Promise<any> {
    let response = await axios.get('/portal.deactivate.json', {
      params: this.params({ portal_id: portalId })
    });
    return response.data;
  }

  // ─── Live Streaming Methods ─────────────────────────

  async listLiveStreams(): Promise<any> {
    let response = await axios.get('/live.list.json', {
      params: this.params()
    });
    return response.data;
  }

  async createLiveStream(options: { name?: string; description?: string }): Promise<any> {
    let response = await axios.get('/live.create.json', {
      params: this.params({
        name: options.name,
        description: options.description
      })
    });
    return response.data;
  }

  async startLiveStream(streamId: string): Promise<any> {
    let response = await axios.get('/live.start.json', {
      params: this.params({ stream_id: streamId })
    });
    return response.data;
  }

  async stopLiveStream(streamId: string): Promise<any> {
    let response = await axios.get('/live.stop.json', {
      params: this.params({ stream_id: streamId })
    });
    return response.data;
  }

  async resetLiveStream(streamId: string): Promise<any> {
    let response = await axios.get('/live.reset.json', {
      params: this.params({ stream_id: streamId })
    });
    return response.data;
  }

  async deleteLiveStream(streamId: string): Promise<any> {
    let response = await axios.get('/live.delete.json', {
      params: this.params({ stream_id: streamId })
    });
    return response.data;
  }

  // ─── Webhook Methods ────────────────────────────────

  async listWebhooks(): Promise<any> {
    let response = await axios.get('/webhook.list.json', {
      params: this.params()
    });
    return response.data;
  }

  async setWebhook(options: {
    hookUrl: string;
    events: string;
    securityKey?: string;
  }): Promise<any> {
    let response = await axios.get('/webhook.set.json', {
      params: this.params({
        hook_url: options.hookUrl,
        events: options.events,
        security_key: options.securityKey
      })
    });
    return response.data;
  }

  async deleteWebhook(hookUrl: string): Promise<any> {
    let response = await axios.get('/webhook.delete.json', {
      params: this.params({ hook_url: hookUrl })
    });
    return response.data;
  }

  // ─── Token Methods ──────────────────────────────────

  async getTempToken(options?: { permissions?: string; ttl?: number }): Promise<any> {
    let response = await axios.get('/token.get_temp.json', {
      params: this.params({
        permissions: options?.permissions,
        ttl: options?.ttl
      })
    });
    return response.data;
  }
}
