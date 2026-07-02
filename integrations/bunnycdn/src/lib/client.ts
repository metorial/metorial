import { createAxios } from 'slates';

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
    this.axios = createAxios({
      baseURL: 'https://api.bunny.net',
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
    return response.data;
  }

  async getPullZone(pullZoneId: number) {
    let response = await this.axios.get(`/pullzone/${pullZoneId}`);
    return response.data;
  }

  async createPullZone(data: Record<string, any>) {
    let response = await this.axios.post('/pullzone', data);
    return response.data;
  }

  async updatePullZone(pullZoneId: number, data: Record<string, any>) {
    let response = await this.axios.post(`/pullzone/${pullZoneId}`, data);
    return response.data;
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
    return response.data;
  }

  async getStorageZone(storageZoneId: number) {
    let response = await this.axios.get(`/storagezone/${storageZoneId}`);
    return response.data;
  }

  async createStorageZone(data: {
    Name: string;
    Region?: string;
    ReplicationRegions?: string[];
    ZoneTier?: number;
  }) {
    let response = await this.axios.post('/storagezone', data);
    return response.data;
  }

  async updateStorageZone(storageZoneId: number, data: Record<string, any>) {
    let response = await this.axios.post(`/storagezone/${storageZoneId}`, data);
    return response.data;
  }

  async deleteStorageZone(storageZoneId: number) {
    let response = await this.axios.delete(`/storagezone/${storageZoneId}`);
    return response.data;
  }

  // DNS Zones
  async listDnsZones(params?: { page?: number; perPage?: number; search?: string }) {
    let response = await this.axios.get('/dnszone', { params });
    return response.data;
  }

  async getDnsZone(dnsZoneId: number) {
    let response = await this.axios.get(`/dnszone/${dnsZoneId}`);
    return response.data;
  }

  async createDnsZone(domain: string) {
    let response = await this.axios.post('/dnszone', { Domain: domain });
    return response.data;
  }

  async updateDnsZone(dnsZoneId: number, data: Record<string, any>) {
    let response = await this.axios.post(`/dnszone/${dnsZoneId}`, data);
    return response.data;
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
    return response.data;
  }

  async getVideoLibrary(libraryId: number, includeAccessKey?: boolean) {
    let response = await this.axios.get(`/videolibrary/${libraryId}`, {
      params: includeAccessKey ? { includeAccessKey: true } : undefined
    });
    return response.data;
  }

  async createVideoLibrary(data: { Name: string; ReplicationRegions?: string[] }) {
    let response = await this.axios.post('/videolibrary', data);
    return response.data;
  }

  async updateVideoLibrary(libraryId: number, data: Record<string, any>) {
    let response = await this.axios.post(`/videolibrary/${libraryId}`, data);
    return response.data;
  }

  async deleteVideoLibrary(libraryId: number) {
    let response = await this.axios.delete(`/videolibrary/${libraryId}`);
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
    return response.data;
  }
}

export class StorageClient {
  private axios;

  constructor(config: { storageToken: string; region: string }) {
    let host = STORAGE_REGION_HOSTS[config.region] || STORAGE_REGION_HOSTS.default;
    this.axios = createAxios({
      baseURL: `https://${host}`,
      headers: {
        AccessKey: config.storageToken
      }
    });
  }

  async listFiles(storageZoneName: string, path: string = '/') {
    let normalizedPath = path.startsWith('/') ? path : `/${path}`;
    let fullPath = `/${storageZoneName}${normalizedPath}`;
    if (!fullPath.endsWith('/')) {
      fullPath += '/';
    }
    let response = await this.axios.get(fullPath);
    return response.data;
  }

  async uploadFile(storageZoneName: string, filePath: string, content: string) {
    let normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    let response = await this.axios.put(`/${storageZoneName}${normalizedPath}`, content, {
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    });
    return response.data;
  }

  async downloadFile(storageZoneName: string, filePath: string) {
    let normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    let response = await this.axios.get(`/${storageZoneName}${normalizedPath}`, {
      responseType: 'text'
    });
    return response.data;
  }

  async deleteFile(storageZoneName: string, filePath: string) {
    let normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    let response = await this.axios.delete(`/${storageZoneName}${normalizedPath}`);
    return response.data;
  }
}

export class StreamClient {
  private axios;

  constructor(config: { streamToken: string }) {
    this.axios = createAxios({
      baseURL: 'https://video.bunnycdn.com',
      headers: {
        AccessKey: config.streamToken,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
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
    return response.data;
  }

  async getVideo(libraryId: number, videoId: string) {
    let response = await this.axios.get(`/library/${libraryId}/videos/${videoId}`);
    return response.data;
  }

  async createVideo(
    libraryId: number,
    data: { title: string; collectionId?: string; thumbnailTime?: number }
  ) {
    let response = await this.axios.post(`/library/${libraryId}/videos`, data);
    return response.data;
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
    data: { url: string; headers?: Record<string, string> }
  ) {
    let response = await this.axios.post(`/library/${libraryId}/videos/fetch`, data);
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
    return response.data;
  }

  async getCollection(libraryId: number, collectionId: string) {
    let response = await this.axios.get(`/library/${libraryId}/collections/${collectionId}`);
    return response.data;
  }

  async createCollection(libraryId: number, name: string) {
    let response = await this.axios.post(`/library/${libraryId}/collections`, { name });
    return response.data;
  }

  async updateCollection(libraryId: number, collectionId: string, name: string) {
    let response = await this.axios.post(`/library/${libraryId}/collections/${collectionId}`, {
      name
    });
    return response.data;
  }

  async deleteCollection(libraryId: number, collectionId: string) {
    let response = await this.axios.delete(
      `/library/${libraryId}/collections/${collectionId}`
    );
    return response.data;
  }
}
