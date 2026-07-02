import { createAxios } from 'slates';
import { extractMetadata, getAllElements, getTagContent } from './xml';

let API_VERSION = '2024-11-04';

export interface ContainerInfo {
  containerName: string;
  lastModified: string;
  eTag: string;
  leaseStatus: string;
  leaseState: string;
  hasImmutabilityPolicy: boolean;
  hasLegalHold: boolean;
  defaultEncryptionScope: string;
  publicAccess: string;
  metadata: Record<string, string>;
}

export interface BlobInfo {
  blobName: string;
  containerName: string;
  creationTime: string;
  lastModified: string;
  eTag: string;
  contentLength: number;
  contentType: string;
  contentEncoding: string;
  blobType: string;
  accessTier: string;
  leaseStatus: string;
  leaseState: string;
  serverEncrypted: boolean;
  metadata: Record<string, string>;
}

export interface BlobProperties {
  blobName: string;
  containerName: string;
  lastModified: string;
  eTag: string;
  contentLength: number;
  contentType: string;
  contentEncoding: string;
  contentLanguage: string;
  contentDisposition: string;
  cacheControl: string;
  blobType: string;
  accessTier: string;
  leaseStatus: string;
  leaseState: string;
  leaseDuration: string;
  copyId: string;
  copyStatus: string;
  copySource: string;
  copyProgress: string;
  serverEncrypted: boolean;
  metadata: Record<string, string>;
}

export interface LeaseResult {
  leaseId: string;
}

export class Client {
  private accountName: string;
  private token: string;
  private isSasToken: boolean;

  constructor(config: { accountName: string; token: string }) {
    this.accountName = config.accountName;
    this.token = config.token;
    // SAS tokens start with query parameters like "sv=" or "?"
    this.isSasToken = config.token.startsWith('sv=') || config.token.startsWith('?');
  }

  private get baseUrl(): string {
    return `https://${this.accountName}.blob.core.windows.net`;
  }

  private getHeaders(): Record<string, string> {
    let headers: Record<string, string> = {
      'x-ms-version': API_VERSION,
      'x-ms-date': new Date().toUTCString()
    };

    if (!this.isSasToken) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  private appendSas(url: string): string {
    if (this.isSasToken) {
      let separator = url.includes('?') ? '&' : '?';
      let sasToken = this.token.startsWith('?') ? this.token.substring(1) : this.token;
      return `${url}${separator}${sasToken}`;
    }
    return url;
  }

  private createAxiosInstance() {
    return createAxios({
      baseURL: this.baseUrl
    });
  }

  // ==================== Container Operations ====================

  async listContainers(
    prefix?: string,
    maxResults?: number
  ): Promise<{ containers: ContainerInfo[]; nextMarker?: string }> {
    let http = this.createAxiosInstance();
    let params: Record<string, string> = { comp: 'list' };
    if (prefix) params.prefix = prefix;
    if (maxResults) params.maxresults = String(maxResults);

    let url = this.appendSas('/');
    let response = await http.get(url, {
      headers: this.getHeaders(),
      params
    });

    let xml = response.data as string;
    let containerElements = getAllElements(xml, 'Container');
    let containers = containerElements.map(
      (el): ContainerInfo => ({
        containerName: getTagContent(el, 'Name') ?? '',
        lastModified: getTagContent(el, 'Last-Modified') ?? '',
        eTag: getTagContent(el, 'Etag') ?? '',
        leaseStatus: getTagContent(el, 'LeaseStatus') ?? '',
        leaseState: getTagContent(el, 'LeaseState') ?? '',
        hasImmutabilityPolicy: getTagContent(el, 'HasImmutabilityPolicy') === 'true',
        hasLegalHold: getTagContent(el, 'HasLegalHold') === 'true',
        defaultEncryptionScope: getTagContent(el, 'DefaultEncryptionScope') ?? '',
        publicAccess: getTagContent(el, 'PublicAccess') ?? 'private',
        metadata: extractMetadata(el)
      })
    );

    let nextMarker = getTagContent(xml, 'NextMarker') || undefined;

    return { containers, nextMarker };
  }

  async createContainer(
    containerName: string,
    publicAccess?: 'container' | 'blob',
    metadata?: Record<string, string>
  ): Promise<void> {
    let http = this.createAxiosInstance();
    let headers = this.getHeaders();

    if (publicAccess) {
      headers['x-ms-blob-public-access'] = publicAccess;
    }

    if (metadata) {
      for (let [key, value] of Object.entries(metadata)) {
        headers[`x-ms-meta-${key}`] = value;
      }
    }

    let url = this.appendSas(`/${containerName}?restype=container`);
    await http.put(url, null, { headers });
  }

  async deleteContainer(containerName: string): Promise<void> {
    let http = this.createAxiosInstance();
    let url = this.appendSas(`/${containerName}?restype=container`);
    await http.delete(url, { headers: this.getHeaders() });
  }

  async getContainerProperties(
    containerName: string
  ): Promise<{ metadata: Record<string, string>; properties: Record<string, string> }> {
    let http = this.createAxiosInstance();
    let url = this.appendSas(`/${containerName}?restype=container`);
    let response = await http.get(url, { headers: this.getHeaders() });

    let responseHeaders = response.headers as Record<string, string>;
    let metadata: Record<string, string> = {};
    let properties: Record<string, string> = {};

    for (let [key, value] of Object.entries(responseHeaders)) {
      if (key.startsWith('x-ms-meta-')) {
        metadata[key.replace('x-ms-meta-', '')] = value;
      }
    }

    properties.lastModified = responseHeaders['last-modified'] ?? '';
    properties.eTag = responseHeaders.etag ?? '';
    properties.leaseStatus = responseHeaders['x-ms-lease-status'] ?? '';
    properties.leaseState = responseHeaders['x-ms-lease-state'] ?? '';
    properties.publicAccess = responseHeaders['x-ms-blob-public-access'] ?? 'private';
    properties.hasImmutabilityPolicy =
      responseHeaders['x-ms-has-immutability-policy'] ?? 'false';
    properties.hasLegalHold = responseHeaders['x-ms-has-legal-hold'] ?? 'false';

    return { metadata, properties };
  }

  async setContainerMetadata(
    containerName: string,
    metadata: Record<string, string>
  ): Promise<void> {
    let http = this.createAxiosInstance();
    let headers = this.getHeaders();

    for (let [key, value] of Object.entries(metadata)) {
      headers[`x-ms-meta-${key}`] = value;
    }

    let url = this.appendSas(`/${containerName}?restype=container&comp=metadata`);
    await http.put(url, null, { headers });
  }

  // ==================== Blob Operations ====================

  async listBlobs(
    containerName: string,
    options?: {
      prefix?: string;
      maxResults?: number;
      marker?: string;
      delimiter?: string;
      include?: string[];
    }
  ): Promise<{ blobs: BlobInfo[]; nextMarker?: string; blobPrefixes: string[] }> {
    let http = this.createAxiosInstance();
    let params: Record<string, string> = {
      restype: 'container',
      comp: 'list'
    };

    if (options?.prefix) params.prefix = options.prefix;
    if (options?.maxResults) params.maxresults = String(options.maxResults);
    if (options?.marker) params.marker = options.marker;
    if (options?.delimiter) params.delimiter = options.delimiter;
    if (options?.include?.length) params.include = options.include.join(',');

    let url = this.appendSas(`/${containerName}`);
    let response = await http.get(url, { headers: this.getHeaders(), params });

    let xml = response.data as string;
    let blobElements = getAllElements(xml, 'Blob');
    let blobs = blobElements.map(
      (el): BlobInfo => ({
        blobName: getTagContent(el, 'Name') ?? '',
        containerName,
        creationTime: getTagContent(el, 'Creation-Time') ?? '',
        lastModified: getTagContent(el, 'Last-Modified') ?? '',
        eTag: getTagContent(el, 'Etag') ?? '',
        contentLength: Number.parseInt(getTagContent(el, 'Content-Length') ?? '0', 10),
        contentType: getTagContent(el, 'Content-Type') ?? '',
        contentEncoding: getTagContent(el, 'Content-Encoding') ?? '',
        blobType: getTagContent(el, 'BlobType') ?? '',
        accessTier: getTagContent(el, 'AccessTier') ?? '',
        leaseStatus: getTagContent(el, 'LeaseStatus') ?? '',
        leaseState: getTagContent(el, 'LeaseState') ?? '',
        serverEncrypted: getTagContent(el, 'ServerEncrypted') === 'true',
        metadata: extractMetadata(el)
      })
    );

    let nextMarker = getTagContent(xml, 'NextMarker') || undefined;
    let prefixElements = getAllElements(xml, 'BlobPrefix');
    let blobPrefixes = prefixElements.map(el => getTagContent(el, 'Name') ?? '');

    return { blobs, nextMarker, blobPrefixes };
  }

  async uploadBlob(
    containerName: string,
    blobName: string,
    content: string,
    options?: {
      contentType?: string;
      blobType?: 'BlockBlob' | 'AppendBlob' | 'PageBlob';
      accessTier?: string;
      metadata?: Record<string, string>;
      contentEncoding?: string;
      cacheControl?: string;
      contentDisposition?: string;
    }
  ): Promise<{ eTag: string; lastModified: string }> {
    let http = this.createAxiosInstance();
    let headers = this.getHeaders();
    let blobType = options?.blobType ?? 'BlockBlob';

    headers['x-ms-blob-type'] = blobType;
    headers['Content-Type'] = options?.contentType ?? 'application/octet-stream';

    if (options?.accessTier) {
      headers['x-ms-access-tier'] = options.accessTier;
    }
    if (options?.contentEncoding) {
      headers['x-ms-blob-content-encoding'] = options.contentEncoding;
    }
    if (options?.cacheControl) {
      headers['x-ms-blob-cache-control'] = options.cacheControl;
    }
    if (options?.contentDisposition) {
      headers['x-ms-blob-content-disposition'] = options.contentDisposition;
    }
    if (options?.metadata) {
      for (let [key, value] of Object.entries(options.metadata)) {
        headers[`x-ms-meta-${key}`] = value;
      }
    }

    let encodedBlobName = blobName.split('/').map(encodeURIComponent).join('/');
    let url = this.appendSas(`/${containerName}/${encodedBlobName}`);
    let response = await http.put(url, content, {
      headers,
      transformRequest: value => value
    });

    let responseHeaders = response.headers as Record<string, string>;
    return {
      eTag: responseHeaders.etag ?? '',
      lastModified: responseHeaders['last-modified'] ?? ''
    };
  }

  async downloadBlob(
    containerName: string,
    blobName: string,
    range?: { offset: number; length?: number }
  ): Promise<{
    content: string;
    contentType: string;
    contentLength: number;
    metadata: Record<string, string>;
  }> {
    let http = this.createAxiosInstance();
    let headers = this.getHeaders();

    if (range) {
      let rangeEnd = range.length ? range.offset + range.length - 1 : '';
      headers['x-ms-range'] = `bytes=${range.offset}-${rangeEnd}`;
    }

    let encodedBlobName = blobName.split('/').map(encodeURIComponent).join('/');
    let url = this.appendSas(`/${containerName}/${encodedBlobName}`);
    let response = await http.get(url, { headers, responseType: 'text' });

    let responseHeaders = response.headers as Record<string, string>;
    let metadata: Record<string, string> = {};
    for (let [key, value] of Object.entries(responseHeaders)) {
      if (key.startsWith('x-ms-meta-')) {
        metadata[key.replace('x-ms-meta-', '')] = value;
      }
    }

    return {
      content: response.data as string,
      contentType: responseHeaders['content-type'] ?? '',
      contentLength: Number.parseInt(responseHeaders['content-length'] ?? '0', 10),
      metadata
    };
  }

  async deleteBlob(
    containerName: string,
    blobName: string,
    options?: { deleteSnapshots?: 'include' | 'only' }
  ): Promise<void> {
    let http = this.createAxiosInstance();
    let headers = this.getHeaders();

    if (options?.deleteSnapshots) {
      headers['x-ms-delete-snapshots'] = options.deleteSnapshots;
    }

    let encodedBlobName = blobName.split('/').map(encodeURIComponent).join('/');
    let url = this.appendSas(`/${containerName}/${encodedBlobName}`);
    await http.delete(url, { headers });
  }

  async getBlobProperties(containerName: string, blobName: string): Promise<BlobProperties> {
    let http = this.createAxiosInstance();
    let encodedBlobName = blobName.split('/').map(encodeURIComponent).join('/');
    let url = this.appendSas(`/${containerName}/${encodedBlobName}`);
    let response = await http.head(url, { headers: this.getHeaders() });

    let h = response.headers as Record<string, string>;
    let metadata: Record<string, string> = {};
    for (let [key, value] of Object.entries(h)) {
      if (key.startsWith('x-ms-meta-')) {
        metadata[key.replace('x-ms-meta-', '')] = value;
      }
    }

    return {
      blobName,
      containerName,
      lastModified: h['last-modified'] ?? '',
      eTag: h.etag ?? '',
      contentLength: Number.parseInt(h['content-length'] ?? '0', 10),
      contentType: h['content-type'] ?? '',
      contentEncoding: h['content-encoding'] ?? '',
      contentLanguage: h['content-language'] ?? '',
      contentDisposition: h['content-disposition'] ?? '',
      cacheControl: h['cache-control'] ?? '',
      blobType: h['x-ms-blob-type'] ?? '',
      accessTier: h['x-ms-access-tier'] ?? '',
      leaseStatus: h['x-ms-lease-status'] ?? '',
      leaseState: h['x-ms-lease-state'] ?? '',
      leaseDuration: h['x-ms-lease-duration'] ?? '',
      copyId: h['x-ms-copy-id'] ?? '',
      copyStatus: h['x-ms-copy-status'] ?? '',
      copySource: h['x-ms-copy-source'] ?? '',
      copyProgress: h['x-ms-copy-progress'] ?? '',
      serverEncrypted: h['x-ms-server-encrypted'] === 'true',
      metadata
    };
  }

  async setBlobProperties(
    containerName: string,
    blobName: string,
    properties: {
      contentType?: string;
      contentEncoding?: string;
      contentLanguage?: string;
      contentDisposition?: string;
      cacheControl?: string;
    }
  ): Promise<void> {
    let http = this.createAxiosInstance();
    let headers = this.getHeaders();

    if (properties.contentType) headers['x-ms-blob-content-type'] = properties.contentType;
    if (properties.contentEncoding)
      headers['x-ms-blob-content-encoding'] = properties.contentEncoding;
    if (properties.contentLanguage)
      headers['x-ms-blob-content-language'] = properties.contentLanguage;
    if (properties.contentDisposition)
      headers['x-ms-blob-content-disposition'] = properties.contentDisposition;
    if (properties.cacheControl) headers['x-ms-blob-cache-control'] = properties.cacheControl;

    let encodedBlobName = blobName.split('/').map(encodeURIComponent).join('/');
    let url = this.appendSas(`/${containerName}/${encodedBlobName}?comp=properties`);
    await http.put(url, null, { headers });
  }

  async setBlobMetadata(
    containerName: string,
    blobName: string,
    metadata: Record<string, string>
  ): Promise<void> {
    let http = this.createAxiosInstance();
    let headers = this.getHeaders();

    for (let [key, value] of Object.entries(metadata)) {
      headers[`x-ms-meta-${key}`] = value;
    }

    let encodedBlobName = blobName.split('/').map(encodeURIComponent).join('/');
    let url = this.appendSas(`/${containerName}/${encodedBlobName}?comp=metadata`);
    await http.put(url, null, { headers });
  }

  // ==================== Blob Tier ====================

  async setBlobTier(containerName: string, blobName: string, tier: string): Promise<void> {
    let http = this.createAxiosInstance();
    let headers = this.getHeaders();
    headers['x-ms-access-tier'] = tier;

    let encodedBlobName = blobName.split('/').map(encodeURIComponent).join('/');
    let url = this.appendSas(`/${containerName}/${encodedBlobName}?comp=tier`);
    await http.put(url, null, { headers });
  }

  // ==================== Copy Operations ====================

  async copyBlob(
    containerName: string,
    blobName: string,
    sourceUrl: string,
    options?: {
      metadata?: Record<string, string>;
      accessTier?: string;
    }
  ): Promise<{ copyId: string; copyStatus: string }> {
    let http = this.createAxiosInstance();
    let headers = this.getHeaders();
    headers['x-ms-copy-source'] = sourceUrl;

    if (options?.accessTier) {
      headers['x-ms-access-tier'] = options.accessTier;
    }
    if (options?.metadata) {
      for (let [key, value] of Object.entries(options.metadata)) {
        headers[`x-ms-meta-${key}`] = value;
      }
    }

    let encodedBlobName = blobName.split('/').map(encodeURIComponent).join('/');
    let url = this.appendSas(`/${containerName}/${encodedBlobName}`);
    let response = await http.put(url, null, { headers });

    let responseHeaders = response.headers as Record<string, string>;
    return {
      copyId: responseHeaders['x-ms-copy-id'] ?? '',
      copyStatus: responseHeaders['x-ms-copy-status'] ?? ''
    };
  }

  getBlobUrl(containerName: string, blobName: string): string {
    let encodedBlobName = blobName.split('/').map(encodeURIComponent).join('/');
    return `${this.baseUrl}/${containerName}/${encodedBlobName}`;
  }

  // ==================== Snapshot Operations ====================

  async createSnapshot(
    containerName: string,
    blobName: string,
    metadata?: Record<string, string>
  ): Promise<{ snapshotId: string }> {
    let http = this.createAxiosInstance();
    let headers = this.getHeaders();

    if (metadata) {
      for (let [key, value] of Object.entries(metadata)) {
        headers[`x-ms-meta-${key}`] = value;
      }
    }

    let encodedBlobName = blobName.split('/').map(encodeURIComponent).join('/');
    let url = this.appendSas(`/${containerName}/${encodedBlobName}?comp=snapshot`);
    let response = await http.put(url, null, { headers });

    let responseHeaders = response.headers as Record<string, string>;
    return {
      snapshotId: responseHeaders['x-ms-snapshot'] ?? ''
    };
  }

  // ==================== Lease Operations ====================

  async acquireLease(
    containerName: string,
    blobName?: string,
    durationSeconds?: number,
    proposedLeaseId?: string
  ): Promise<LeaseResult> {
    let http = this.createAxiosInstance();
    let headers = this.getHeaders();
    headers['x-ms-lease-action'] = 'acquire';
    headers['x-ms-lease-duration'] = String(durationSeconds ?? -1);

    if (proposedLeaseId) {
      headers['x-ms-proposed-lease-id'] = proposedLeaseId;
    }

    let path: string;
    if (blobName) {
      let encodedBlobName = blobName.split('/').map(encodeURIComponent).join('/');
      path = `/${containerName}/${encodedBlobName}?comp=lease`;
    } else {
      path = `/${containerName}?restype=container&comp=lease`;
    }

    let url = this.appendSas(path);
    let response = await http.put(url, null, { headers });

    let responseHeaders = response.headers as Record<string, string>;
    return {
      leaseId: responseHeaders['x-ms-lease-id'] ?? ''
    };
  }

  async renewLease(
    containerName: string,
    leaseId: string,
    blobName?: string
  ): Promise<LeaseResult> {
    let http = this.createAxiosInstance();
    let headers = this.getHeaders();
    headers['x-ms-lease-action'] = 'renew';
    headers['x-ms-lease-id'] = leaseId;

    let path: string;
    if (blobName) {
      let encodedBlobName = blobName.split('/').map(encodeURIComponent).join('/');
      path = `/${containerName}/${encodedBlobName}?comp=lease`;
    } else {
      path = `/${containerName}?restype=container&comp=lease`;
    }

    let url = this.appendSas(path);
    let response = await http.put(url, null, { headers });

    let responseHeaders = response.headers as Record<string, string>;
    return {
      leaseId: responseHeaders['x-ms-lease-id'] ?? ''
    };
  }

  async releaseLease(
    containerName: string,
    leaseId: string,
    blobName?: string
  ): Promise<void> {
    let http = this.createAxiosInstance();
    let headers = this.getHeaders();
    headers['x-ms-lease-action'] = 'release';
    headers['x-ms-lease-id'] = leaseId;

    let path: string;
    if (blobName) {
      let encodedBlobName = blobName.split('/').map(encodeURIComponent).join('/');
      path = `/${containerName}/${encodedBlobName}?comp=lease`;
    } else {
      path = `/${containerName}?restype=container&comp=lease`;
    }

    let url = this.appendSas(path);
    await http.put(url, null, { headers });
  }

  async breakLease(
    containerName: string,
    blobName?: string,
    breakPeriod?: number
  ): Promise<{ leaseTime: number }> {
    let http = this.createAxiosInstance();
    let headers = this.getHeaders();
    headers['x-ms-lease-action'] = 'break';

    if (breakPeriod !== undefined) {
      headers['x-ms-lease-break-period'] = String(breakPeriod);
    }

    let path: string;
    if (blobName) {
      let encodedBlobName = blobName.split('/').map(encodeURIComponent).join('/');
      path = `/${containerName}/${encodedBlobName}?comp=lease`;
    } else {
      path = `/${containerName}?restype=container&comp=lease`;
    }

    let url = this.appendSas(path);
    let response = await http.put(url, null, { headers });

    let responseHeaders = response.headers as Record<string, string>;
    return {
      leaseTime: Number.parseInt(responseHeaders['x-ms-lease-time'] ?? '0', 10)
    };
  }

  // ==================== Append Blob ====================

  async appendBlock(
    containerName: string,
    blobName: string,
    content: string
  ): Promise<{ appendOffset: string; committedBlockCount: number }> {
    let http = this.createAxiosInstance();
    let headers = this.getHeaders();
    headers['Content-Type'] = 'application/octet-stream';

    let encodedBlobName = blobName.split('/').map(encodeURIComponent).join('/');
    let url = this.appendSas(`/${containerName}/${encodedBlobName}?comp=appendblock`);
    let response = await http.put(url, content, { headers });

    let responseHeaders = response.headers as Record<string, string>;
    return {
      appendOffset: responseHeaders['x-ms-blob-append-offset'] ?? '0',
      committedBlockCount: Number.parseInt(
        responseHeaders['x-ms-blob-committed-block-count'] ?? '0',
        10
      )
    };
  }

  // ==================== Lifecycle Management ====================

  async getLifecyclePolicy(
    accountName: string,
    token: string,
    subscriptionId: string,
    resourceGroupName: string
  ): Promise<any> {
    let http = createAxios({
      baseURL: 'https://management.azure.com'
    });

    let response = await http.get(
      `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${accountName}/managementPolicies/default?api-version=2023-05-01`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    return response.data;
  }
}
