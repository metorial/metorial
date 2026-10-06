import { z } from 'zod';
import {
  assetSchema,
  exactId,
  inconsistent,
  integer,
  invalid,
  parse,
  validText
} from './contracts';
import { type ApiConfiguration, PrismicTransport } from './transport';
import { fetchUploadSource } from './upload-source';

export interface AssetApiConfig extends ApiConfiguration {
  writeToken: string;
}
export type PrismicAsset = z.infer<typeof assetSchema>;
export interface AssetListResponse {
  results: PrismicAsset[];
  total: number;
  cursor?: string;
  missing_ids?: string[];
  items_length: number;
  is_opensearch_result: boolean;
}
const tagSchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    created_at: z.number(),
    last_modified: z.number(),
    uploader_id: z.string().optional()
  })
  .passthrough();
export type AssetTag = z.infer<typeof tagSchema>;
export class AssetApiClient {
  private readonly transport: PrismicTransport;
  constructor(config: AssetApiConfig) {
    this.transport = new PrismicTransport(
      config,
      'https://asset-api.prismic.io',
      config.writeToken
    );
  }
  private metadata(input: {
    notes?: string;
    credits?: string;
    alt?: string;
    tags?: string[];
  }) {
    this.transport.check(input);
    for (const key of ['notes', 'credits', 'alt'] as const) {
      const text = input[key];
      if (
        text !== undefined &&
        (Array.from(text).length > 500 ||
          Array.from(text).some(
            char =>
              (char.charCodeAt(0) < 32 && char !== '\n' && char !== '\t') ||
              char.charCodeAt(0) === 127
          ))
      )
        invalid(
          'Asset notes, credits and alt text must be at most 500 characters without unsupported controls.'
        );
      if (text !== undefined) {
        try {
          encodeURIComponent(text);
        } catch {
          invalid('Asset metadata must contain valid Unicode text.');
        }
      }
    }
  }
  private async resolveTags(names: string[]) {
    const tags = await this.listAssetTags();
    return [...new Set(names)].map(name => {
      validText(name, 'tag name');
      const matches = tags.filter(tag => tag.name === name);
      return matches.length === 1
        ? matches[0]!.id
        : invalid(
            'Each asset tag name must already exist uniquely in the media library. Create missing tags in the dashboard first.'
          );
    });
  }
  async listAssets(
    options: {
      cursor?: string;
      assetType?: string;
      keyword?: string;
      ids?: string[];
      tags?: string[];
      pageSize?: number;
    } = {}
  ): Promise<AssetListResponse> {
    this.transport.check(options);
    integer(options.pageSize, 1, 100, 'pageSize');
    if (options.ids?.some(id => !id)) invalid('Provide nonempty asset IDs.');
    const params: Record<string, unknown> = {};
    if (options.cursor !== undefined) params.cursor = exactId(options.cursor);
    if (options.assetType !== undefined) params.assetType = validText(options.assetType);
    if (options.keyword !== undefined) params.keyword = validText(options.keyword);
    if (options.pageSize !== undefined) params.limit = options.pageSize;
    if (options.ids !== undefined) params.ids = options.ids.map(exactId).join(',');
    if (options.tags !== undefined)
      params.tags = (await this.resolveTags(options.tags)).join(',');
    const response = await this.transport.request('GET', '/assets', { params });
    this.transport.check(response.data);
    const value = parse(
      z
        .object({
          items: z.array(assetSchema),
          total: z.number().int().nonnegative(),
          cursor: z.string().optional(),
          missing_ids: z.array(z.string()).optional(),
          is_opensearch_result: z.boolean().optional()
        })
        .passthrough(),
      response.data
    );
    if (
      (options.pageSize !== undefined && value.items.length > options.pageSize) ||
      new Set(value.items.map(asset => asset.id)).size !== value.items.length ||
      (value.cursor !== undefined && (!value.cursor || value.cursor === options.cursor))
    )
      inconsistent();
    if (options.ids && value.items.some(asset => !options.ids!.includes(asset.id)))
      inconsistent();
    return {
      results: value.items,
      total: value.total,
      cursor: value.cursor,
      missing_ids: value.missing_ids,
      items_length: value.items.length,
      is_opensearch_result: value.is_opensearch_result ?? false
    };
  }
  async getAsset(assetId: string): Promise<PrismicAsset> {
    const result = await this.listAssets({ ids: [exactId(assetId)] });
    if (!result.results.length && result.missing_ids?.includes(assetId))
      return invalid('The requested asset does not exist.');
    return result.results.length === 1 && result.results[0]!.id === assetId
      ? result.results[0]!
      : inconsistent();
  }
  async uploadAsset(options: {
    url: string;
    filename: string;
    notes?: string;
    credits?: string;
    alt?: string;
    tags?: string[];
  }): Promise<PrismicAsset> {
    this.metadata(options);
    this.transport.check(options);
    validText(options.filename, 'filename');
    if (/[/\\]/.test(options.filename))
      invalid('Provide a filename without a directory path.');
    // Resolve existing tags before accepting an upload, avoiding orphan tag creation.
    if (options.tags !== undefined) await this.resolveTags(options.tags);
    const bytes = await fetchUploadSource(options.url);
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(bytes)]), options.filename);
    for (const key of ['notes', 'credits', 'alt'] as const)
      if (options[key] !== undefined) form.append(key, options[key]);
    const response = await this.transport.request('POST', '/assets', { data: form });
    this.transport.check(response.data);
    const receipt = parse(assetSchema, response.data);
    if (receipt.filename !== options.filename) inconsistent();
    const asset =
      options.tags !== undefined
        ? await this.updateAsset(receipt.id, { tags: options.tags })
        : await this.getAsset(receipt.id);
    if (asset.filename !== options.filename) inconsistent();
    for (const key of ['notes', 'credits', 'alt'] as const)
      if (options[key] !== undefined && asset[key] !== options[key]) inconsistent();
    return asset;
  }
  async updateAsset(
    assetId: string,
    updates: { notes?: string; credits?: string; alt?: string; tags?: string[] }
  ): Promise<PrismicAsset> {
    exactId(assetId);
    this.metadata(updates);
    if (!Object.values(updates).some(value => value !== undefined))
      invalid('Provide at least one asset metadata field to update.');
    const tags = updates.tags === undefined ? undefined : await this.resolveTags(updates.tags);
    const response = await this.transport.request(
      'PATCH',
      `/assets/${encodeURIComponent(assetId)}`,
      { data: { ...updates, tags }, headers: { 'Content-Type': 'application/json' } }
    );
    this.transport.check(response.data);
    const receipt = parse(assetSchema, response.data);
    if (receipt.id !== assetId) inconsistent();
    const asset = await this.getAsset(assetId);
    for (const key of ['notes', 'credits', 'alt'] as const)
      if (updates[key] !== undefined && asset[key] !== updates[key]) inconsistent();
    if (
      updates.tags !== undefined &&
      JSON.stringify([...(asset.tags ?? []).map(tag => tag.name)].sort()) !==
        JSON.stringify([...new Set(updates.tags)].sort())
    )
      inconsistent();
    return asset;
  }
  async deleteAsset(assetId: string): Promise<void> {
    const response = await this.transport.request(
      'DELETE',
      `/assets/${encodeURIComponent(exactId(assetId))}`
    );
    this.transport.check(response.data);
  }
  async listAssetTags(): Promise<AssetTag[]> {
    const response = await this.transport.request('GET', '/tags');
    this.transport.check(response.data);
    return parse(z.object({ items: z.array(tagSchema) }).passthrough(), response.data).items;
  }
  async createAssetTag(name: string): Promise<AssetTag> {
    validText(name, 'tag name');
    this.transport.check(name);
    const response = await this.transport.request('POST', '/tags', {
      data: { name },
      headers: { 'Content-Type': 'application/json' }
    });
    this.transport.check(response.data);
    const tag = parse(tagSchema, response.data);
    return tag.name === name ? tag : inconsistent();
  }
}
