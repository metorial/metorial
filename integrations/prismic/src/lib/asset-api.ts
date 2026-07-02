import { createAxios } from 'slates';

export interface AssetApiConfig {
  repositoryName: string;
  writeToken: string;
}

export interface PrismicAsset {
  id: string;
  url: string;
  filename: string;
  extension: string;
  size: number;
  kind: string;
  width?: number;
  height?: number;
  notes?: string;
  credits?: string;
  alt?: string;
  tags?: { name: string }[];
  last_modified: number;
  created_at: number;
}

export interface AssetListResponse {
  results: PrismicAsset[];
  total: number;
  cursor?: string;
  missing_ids?: string[];
  items_length: number;
  is_opensearch_result: boolean;
}

export interface AssetTag {
  id: string;
  name: string;
  created_at: number;
  last_modified: number;
  uploader_id?: string;
}

export class AssetApiClient {
  private repositoryName: string;
  private writeToken: string;

  constructor(config: AssetApiConfig) {
    this.repositoryName = config.repositoryName;
    this.writeToken = config.writeToken;
  }

  private getAxios() {
    return createAxios({
      baseURL: 'https://asset-api.prismic.io',
      headers: {
        Authorization: `Bearer ${this.writeToken}`,
        repository: this.repositoryName
      }
    });
  }

  async listAssets(options?: {
    cursor?: string;
    assetType?: string;
    keyword?: string;
    ids?: string[];
    tags?: string[];
    pageSize?: number;
  }): Promise<AssetListResponse> {
    let axios = this.getAxios();
    let params: Record<string, any> = {};

    if (options?.cursor) params.cursor = options.cursor;
    if (options?.assetType) params.assetType = options.assetType;
    if (options?.keyword) params.keyword = options.keyword;
    if (options?.pageSize) params.pageSize = options.pageSize;
    if (options?.ids) params.ids = options.ids.join(',');
    if (options?.tags) params.tags = options.tags.join(',');

    let response = await axios.get('/assets', { params });
    return response.data as AssetListResponse;
  }

  async getAsset(assetId: string): Promise<PrismicAsset> {
    let result = await this.listAssets({ ids: [assetId] });
    let asset = result.results[0];
    if (!asset) {
      throw new Error(`Asset with ID ${assetId} not found`);
    }
    return asset;
  }

  async uploadAsset(options: {
    url: string;
    filename: string;
    notes?: string;
    credits?: string;
    alt?: string;
    tags?: string[];
  }): Promise<PrismicAsset> {
    let axios = this.getAxios();

    let response = await axios.post(
      '/assets',
      {
        url: options.url,
        filename: options.filename,
        notes: options.notes,
        credits: options.credits,
        alt: options.alt,
        tags: options.tags
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data as PrismicAsset;
  }

  async updateAsset(
    assetId: string,
    updates: {
      notes?: string;
      credits?: string;
      alt?: string;
      tags?: string[];
    }
  ): Promise<PrismicAsset> {
    let axios = this.getAxios();
    let response = await axios.patch(`/assets/${assetId}`, updates, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data as PrismicAsset;
  }

  async deleteAsset(assetId: string): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/assets/${assetId}`);
  }

  // Asset Tags

  async listAssetTags(): Promise<AssetTag[]> {
    let axios = this.getAxios();
    let response = await axios.get('/tags');
    return response.data as AssetTag[];
  }

  async createAssetTag(name: string): Promise<AssetTag> {
    let axios = this.getAxios();
    let response = await axios.post(
      '/tags',
      { name },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data as AssetTag;
  }
}
