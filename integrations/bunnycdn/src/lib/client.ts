import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

// Bunny uses PascalCase resource fields and GUIDs that differ from the public IDs.
let mapBunnyObject = (value: Record<string, any>, idKey?: string) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createApiServiceError('Bunny returned an invalid resource response.', {
      reason: 'invalid_bunny_response'
    });
  }
  if (idKey) {
    let usesGuid = idKey === 'videoId' || idKey === 'collectionId';
    let id = usesGuid ? value.guid : value.Id;
    if (
      usesGuid
        ? typeof id !== 'string' || !id.trim()
        : typeof id !== 'number' || !Number.isInteger(id) || id <= 0
    ) {
      throw createApiServiceError(`Bunny returned a resource without a valid ${idKey}.`, {
        reason: 'invalid_bunny_response'
      });
    }
    let requiredField =
      idKey === 'dnsZoneId'
        ? 'Domain'
        : ['pullZoneId', 'storageZoneId', 'videoLibraryId'].includes(idKey)
          ? 'Name'
          : undefined;
    if (requiredField && typeof value[requiredField] !== 'string') {
      throw createApiServiceError(
        `Bunny returned a resource without its required ${requiredField.toLowerCase()}.`,
        { reason: 'invalid_bunny_response' }
      );
    }
  }
  let result: Record<string, any> = { ...value };
  for (let [key, field] of Object.entries(value)) {
    let publicKey = key.charAt(0).toLowerCase() + key.slice(1);
    if (field !== null && field !== undefined) result[publicKey] = field;
    else if (publicKey === key) delete result[publicKey];
  }
  if (idKey) result[idKey] = value.Id ?? value.guid;
  if (Array.isArray(value.Hostnames))
    result.hostnames = value.Hostnames.map((host: Record<string, any>) => {
      if (!host || typeof host.Value !== 'string') {
        throw createApiServiceError('Bunny returned a hostname without its required value.', {
          reason: 'invalid_bunny_response'
        });
      }
      return mapBunnyObject(host);
    });
  if (Array.isArray(value.Records))
    result.records = value.Records.map((record: Record<string, any>) =>
      mapBunnyObject(record, 'recordId')
    );
  if (Array.isArray(value.captions))
    result.captions = value.captions.map((caption: Record<string, any>) =>
      mapBunnyObject(caption)
    );
  if (Array.isArray(value.BillingRecords))
    result.billingRecords = value.BillingRecords.map((record: Record<string, any>) =>
      mapBunnyObject(record)
    );
  if (value.EnableMP4Fallback != null) result.enableMp4Fallback = value.EnableMP4Fallback;
  if (value.EnableDRM != null) result.enableDrm = value.EnableDRM;
  return result;
};

let mapBunnyList = (value: any, idKey: string) => {
  let items = Array.isArray(value) ? value : (value.Items ?? []);
  return {
    ...(Array.isArray(value) ? { TotalItems: items.length, CurrentPage: 0 } : value),
    Items: items.map((item: Record<string, any>) => mapBunnyObject(item, idKey))
  };
};

let STORAGE_REGION_HOSTS: Record<string, string> = {
  default: 'storage.bunnycdn.com',
  ny: 'ny.storage.bunnycdn.com',
  la: 'la.storage.bunnycdn.com',
  uk: 'uk.storage.bunnycdn.com',
  sg: 'sg.storage.bunnycdn.com',
  syd: 'syd.storage.bunnycdn.com',
  se: 'se.storage.bunnycdn.com',
  br: 'br.storage.bunnycdn.com',
  jh: 'jh.storage.bunnycdn.com'
};

export class CoreClient {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.bunny.net',
      timeout: 30000,
      errorAdapter: error =>
        buildApiServiceError(error, { providerLabel: 'Bunny', reason: 'bunny_api_error' }),
      headers: {
        AccessKey: config.token,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  // Pull Zones
  async listPullZones(params?: { page?: number; perPage?: number; search?: string }) {
    let response = await this.axios.get('/pullzone', { params });
    return mapBunnyList(response.data, 'pullZoneId');
  }

  async getPullZone(pullZoneId: number) {
    let response = await this.axios.get(`/pullzone/${pullZoneId}`);
    return Object.assign(mapBunnyObject(response.data, 'pullZoneId'), {
      pullZoneId: response.data.Id,
      name: response.data.Name
    });
  }

  async createPullZone(data: Record<string, any>) {
    let response = await this.axios.post('/pullzone', data);
    return Object.assign(mapBunnyObject(response.data, 'pullZoneId'), {
      pullZoneId: response.data.Id,
      name: response.data.Name
    });
  }

  async updatePullZone(pullZoneId: number, data: Record<string, any>) {
    let response = await this.axios.post(`/pullzone/${pullZoneId}`, data);
    return Object.assign(mapBunnyObject(response.data, 'pullZoneId'), {
      pullZoneId: response.data.Id,
      name: response.data.Name
    });
  }

  async deletePullZone(pullZoneId: number) {
    let response = await this.axios.delete(`/pullzone/${pullZoneId}`);
    return response.data;
  }

  async addPullZoneHostname(pullZoneId: number, hostname: string) {
    let response = await this.axios.post(`/pullzone/${pullZoneId}/hostnames`, {
      Hostname: hostname
    });
    return response.data;
  }

  async deletePullZoneHostname(pullZoneId: number, hostname: string) {
    let response = await this.axios.delete(`/pullzone/${pullZoneId}/hostnames`, {
      data: { Hostname: hostname }
    });
    return response.data;
  }

  async addPullZoneBlockedIp(pullZoneId: number, blockedIp: string) {
    let response = await this.axios.post(`/pullzone/${pullZoneId}/blockedips`, {
      BlockedIp: blockedIp
    });
    return response.data;
  }

  async deletePullZoneBlockedIp(pullZoneId: number, blockedIp: string) {
    let response = await this.axios.delete(`/pullzone/${pullZoneId}/blockedips`, {
      data: { BlockedIp: blockedIp }
    });
    return response.data;
  }

  // Cache Purging
  async purgeUrl(url: string) {
    let response = await this.axios.post('/purge', null, { params: { url } });
    return response.data;
  }

  async purgePullZoneCache(pullZoneId: number, cacheTag?: string) {
    let body = cacheTag ? { CacheTag: cacheTag } : undefined;
    let response = await this.axios.post(`/pullzone/${pullZoneId}/purgeCache`, body);
    return response.data;
  }

  // Storage Zones (management via core API)
  async listStorageZones(params?: {
    page?: number;
    perPage?: number;
    includeDeleted?: boolean;
  }) {
    let response = await this.axios.get('/storagezone', { params });
    return mapBunnyList(response.data, 'storageZoneId');
  }

  async getStorageZone(storageZoneId: number) {
    let response = await this.axios.get(`/storagezone/${storageZoneId}`);
    return Object.assign(mapBunnyObject(response.data, 'storageZoneId'), {
      storageZoneId: response.data.Id,
      name: response.data.Name
    });
  }

  async createStorageZone(data: {
    Name: string;
    Region: string;
    ReplicationRegions?: string[];
    ZoneTier?: number;
  }) {
    let response = await this.axios.post('/storagezone', data);
    return Object.assign(mapBunnyObject(response.data, 'storageZoneId'), {
      storageZoneId: response.data.Id,
      name: response.data.Name
    });
  }

  async updateStorageZone(storageZoneId: number, data: Record<string, any>) {
    await this.axios.post(`/storagezone/${storageZoneId}`, data);
    return this.getStorageZone(storageZoneId);
  }

  async deleteStorageZone(storageZoneId: number) {
    let response = await this.axios.delete(`/storagezone/${storageZoneId}`);
    return response.data;
  }

  // DNS Zones
  async listDnsZones(params?: { page?: number; perPage?: number; search?: string }) {
    let response = await this.axios.get('/dnszone', { params });
    return mapBunnyList(response.data, 'dnsZoneId');
  }

  async getDnsZone(dnsZoneId: number) {
    let response = await this.axios.get(`/dnszone/${dnsZoneId}`);
    return Object.assign(mapBunnyObject(response.data, 'dnsZoneId'), {
      dnsZoneId: response.data.Id,
      domain: response.data.Domain
    });
  }

  async createDnsZone(domain: string) {
    let response = await this.axios.post('/dnszone', { Domain: domain });
    return Object.assign(mapBunnyObject(response.data, 'dnsZoneId'), {
      dnsZoneId: response.data.Id,
      domain: response.data.Domain
    });
  }

  async updateDnsZone(dnsZoneId: number, data: Record<string, any>) {
    let response = await this.axios.post(`/dnszone/${dnsZoneId}`, data);
    return Object.assign(mapBunnyObject(response.data, 'dnsZoneId'), {
      dnsZoneId: response.data.Id,
      domain: response.data.Domain
    });
  }

  async deleteDnsZone(dnsZoneId: number) {
    let response = await this.axios.delete(`/dnszone/${dnsZoneId}`);
    return response.data;
  }

  async addDnsRecord(dnsZoneId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/dnszone/${dnsZoneId}/records`, data);
    return response.data;
  }

  async updateDnsRecord(dnsZoneId: number, recordId: number, data: Record<string, any>) {
    let response = await this.axios.post(`/dnszone/${dnsZoneId}/records/${recordId}`, data);
    return response.data;
  }

  async deleteDnsRecord(dnsZoneId: number, recordId: number) {
    let response = await this.axios.delete(`/dnszone/${dnsZoneId}/records/${recordId}`);
    return response.data;
  }

  // Video Libraries (managed via core API)
  async listVideoLibraries(params?: {
    page?: number;
    perPage?: number;
    search?: string;
    includeAccessKey?: boolean;
  }) {
    let response = await this.axios.get('/videolibrary', { params });
    return mapBunnyList(response.data, 'videoLibraryId');
  }

  async getVideoLibrary(libraryId: number, includeAccessKey?: boolean) {
    let response = await this.axios.get(`/videolibrary/${libraryId}`, {
      params: includeAccessKey ? { includeAccessKey: true } : undefined
    });
    return Object.assign(mapBunnyObject(response.data, 'videoLibraryId'), {
      videoLibraryId: response.data.Id,
      name: response.data.Name
    });
  }

  async createVideoLibrary(data: { Name: string; ReplicationRegions?: string[] }) {
    let response = await this.axios.post('/videolibrary', data);
    return Object.assign(mapBunnyObject(response.data, 'videoLibraryId'), {
      videoLibraryId: response.data.Id,
      name: response.data.Name
    });
  }

  async updateVideoLibrary(libraryId: number, data: Record<string, any>) {
    let response = await this.axios.post(`/videolibrary/${libraryId}`, data);
    return Object.assign(mapBunnyObject(response.data, 'videoLibraryId'), {
      videoLibraryId: response.data.Id,
      name: response.data.Name
    });
  }

  async deleteVideoLibrary(libraryId: number) {
    let response = await this.axios.delete(`/videolibrary/${libraryId}`);
    return response.data;
  }

  async listDnsRecords(
    dnsZoneId: number,
    params: { page?: number; perPage?: number; type?: number; search?: string }
  ) {
    let response = await this.axios.get(`/dnszone/${dnsZoneId}/records`, { params });
    return mapBunnyList(response.data, 'recordId');
  }

  async getStorageStatistics(
    storageZoneId: number,
    params: { dateFrom?: string; dateTo?: string }
  ) {
    let response = await this.axios.get(`/storagezone/${storageZoneId}/statistics`, {
      params
    });
    return response.data;
  }

  // Statistics
  async getStatistics(params?: Record<string, any>) {
    let response = await this.axios.get('/statistics', { params });
    return response.data;
  }

  // Billing
  async getBillingSummary() {
    let response = await this.axios.get('/billing');
    return mapBunnyObject(response.data);
  }
}

export class StorageClient {
  private axios;
  private host: string;

  constructor(config: { storageToken: string; region: string }) {
    let host = STORAGE_REGION_HOSTS[config.region] || 'storage.bunnycdn.com';
    this.host = host;
    this.axios = createAuthenticatedAxios({
      baseURL: `https://${host}`,
      timeout: 30000,
      contentType: false,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Bunny Storage',
          reason: 'bunny_api_error'
        }),
      headers: {
        AccessKey: config.storageToken
      }
    });
  }

  getFileUrl(storageZoneName: string, filePath: string) {
    let segments = filePath.replace(/^\/+/, '').split('/');
    if (segments.some(segment => segment === '.' || segment === '..')) {
      throw createApiServiceError('File paths cannot contain . or .. segments.');
    }
    return `https://${this.host}/${encodeURIComponent(storageZoneName)}/${segments.map(encodeURIComponent).join('/')}`;
  }

  async listFiles(storageZoneName: string, path: string = '/') {
    let url = this.getFileUrl(storageZoneName, path);
    let response = await this.axios.get(url.endsWith('/') ? url : `${url}/`);
    return response.data.map((file: Record<string, any>) => mapBunnyObject(file));
  }

  async uploadFile(storageZoneName: string, filePath: string, content: string | Buffer) {
    let response = await this.axios.put(this.getFileUrl(storageZoneName, filePath), content, {
      headers: { 'Content-Type': 'application/octet-stream' }
    });
    return response.data;
  }

  async downloadFile(storageZoneName: string, filePath: string) {
    let response = await this.axios.get(this.getFileUrl(storageZoneName, filePath), {
      responseType: 'text'
    });
    return response.data;
  }

  async deleteFile(storageZoneName: string, filePath: string) {
    let response = await this.axios.delete(this.getFileUrl(storageZoneName, filePath));
    return response.data;
  }
}

export class StreamClient {
  private axios;

  constructor(config: { streamToken: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://video.bunnycdn.com',
      timeout: 30000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Bunny Stream',
          reason: 'bunny_api_error'
        }),
      headers: {
        AccessKey: config.streamToken,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
    this.axios.interceptors.response.use(response => {
      if (response.data?.success === false) {
        throw createApiServiceError(
          response.data.message || 'Bunny Stream rejected the operation.',
          { upstreamStatus: response.data.statusCode }
        );
      }
      return response;
    });
  }

  // Videos
  async listVideos(
    libraryId: number,
    params?: {
      page?: number;
      itemsPerPage?: number;
      search?: string;
      collection?: string;
      orderBy?: string;
    }
  ) {
    let response = await this.axios.get(`/library/${libraryId}/videos`, { params });
    return {
      ...response.data,
      items: (response.data.items ?? []).map((video: Record<string, any>) =>
        mapBunnyObject(video, 'videoId')
      )
    };
  }

  async getVideo(libraryId: number, videoId: string) {
    let response = await this.axios.get(`/library/${libraryId}/videos/${videoId}`);
    return Object.assign(mapBunnyObject(response.data, 'videoId'), {
      videoId: response.data.guid
    });
  }

  async createVideo(
    libraryId: number,
    data: { title: string; collectionId?: string; thumbnailTime?: number }
  ) {
    let response = await this.axios.post(`/library/${libraryId}/videos`, data);
    return Object.assign(mapBunnyObject(response.data, 'videoId'), {
      videoId: response.data.guid
    });
  }

  async updateVideo(libraryId: number, videoId: string, data: Record<string, any>) {
    let response = await this.axios.post(`/library/${libraryId}/videos/${videoId}`, data);
    return response.data;
  }

  async deleteVideo(libraryId: number, videoId: string) {
    let response = await this.axios.delete(`/library/${libraryId}/videos/${videoId}`);
    return response.data;
  }

  async fetchVideo(
    libraryId: number,
    data: { url: string; headers?: Record<string, string>; title?: string },
    params?: { collectionId?: string; thumbnailTime?: number }
  ) {
    let response = await this.axios.post(`/library/${libraryId}/videos/fetch`, data, {
      params
    });
    return response.data;
  }

  async reencodeVideo(libraryId: number, videoId: string) {
    let response = await this.axios.post(`/library/${libraryId}/videos/${videoId}/reencode`);
    return response.data;
  }

  async setThumbnail(libraryId: number, videoId: string, thumbnailUrl: string) {
    let response = await this.axios.post(
      `/library/${libraryId}/videos/${videoId}/thumbnail`,
      null,
      {
        params: { thumbnailUrl }
      }
    );
    return response.data;
  }

  async addCaption(
    libraryId: number,
    videoId: string,
    language: string,
    data: { srclang: string; label: string; captionsFile: string }
  ) {
    let response = await this.axios.post(
      `/library/${libraryId}/videos/${videoId}/captions/${language}`,
      data
    );
    return response.data;
  }

  async deleteCaption(libraryId: number, videoId: string, language: string) {
    let response = await this.axios.delete(
      `/library/${libraryId}/videos/${videoId}/captions/${language}`
    );
    return response.data;
  }

  // Collections
  async listCollections(
    libraryId: number,
    params?: { page?: number; itemsPerPage?: number; search?: string; orderBy?: string }
  ) {
    let response = await this.axios.get(`/library/${libraryId}/collections`, { params });
    return {
      ...response.data,
      items: (response.data.items ?? []).map((collection: Record<string, any>) =>
        mapBunnyObject(collection, 'collectionId')
      )
    };
  }

  async getCollection(libraryId: number, collectionId: string) {
    let response = await this.axios.get(`/library/${libraryId}/collections/${collectionId}`);
    return Object.assign(mapBunnyObject(response.data, 'collectionId'), {
      collectionId: response.data.guid
    });
  }

  async createCollection(libraryId: number, name: string) {
    let response = await this.axios.post(`/library/${libraryId}/collections`, { name });
    return Object.assign(mapBunnyObject(response.data, 'collectionId'), {
      collectionId: response.data.guid
    });
  }

  async updateCollection(libraryId: number, collectionId: string, name: string) {
    await this.axios.post(`/library/${libraryId}/collections/${collectionId}`, {
      name
    });
    return this.getCollection(libraryId, collectionId);
  }

  async deleteCollection(libraryId: number, collectionId: string) {
    let response = await this.axios.delete(
      `/library/${libraryId}/collections/${collectionId}`
    );
    return response.data;
  }
}
