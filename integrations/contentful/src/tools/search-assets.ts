import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, mergeQuery, pageInfo } from '../lib/helpers';
import { limitSchema, pageOutput, resourceId, selection, skipSchema } from '../lib/schemas';
import { spec } from '../spec';

export let searchAssets = SlateTool.create(spec, {
  name: 'Search Assets',
  key: 'search_assets',
  description: `Search and filter assets in a Contentful space. Supports filtering by mime type, file name, and other query parameters. Returns asset metadata, file URLs, and dimensions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ...selection,
      locale: resourceId
        .optional()
        .describe(
          'Locale for the summary file fields. When omitted these fields are returned only for a single file locale.'
        ),
      api: z
        .enum(['management', 'delivery', 'preview'])
        .optional()
        .describe(
          'API for legacy token-only connections. Must match the credential type; reconnect if unknown.'
        ),
      mimeTypeGroup: z
        .string()
        .optional()
        .describe(
          'Filter by MIME type group (e.g. "image", "video", "plaintext", "richtext", "spreadsheet", "archive", "code").'
        ),
      queryParams: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional Contentful search parameters as key-value pairs.'),
      limit: limitSchema.describe('Max number of assets to return (1-1000, default 100).'),
      skip: skipSchema.describe('Number of assets to skip for pagination.')
    })
  )
  .output(
    z.object({
      ...pageOutput,
      total: z.number().describe('Total number of matching assets.'),
      skip: z.number().describe('Number of assets skipped.'),
      limit: z.number().describe('Max assets returned.'),
      assets: z.array(
        z.object({
          assetId: resourceId,
          fileLocales: z.array(z.string()).optional(),
          title: z.record(z.string(), z.string()).optional(),
          description: z.record(z.string(), z.string()).optional(),
          fileName: z.string().optional(),
          contentType: z.string().optional(),
          url: z.string().optional(),
          size: z.number().optional(),
          width: z.number().optional(),
          height: z.number().optional(),
          version: z.number().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth, ctx.input);

    let params: Record<string, string | number | boolean> = {};
    if (ctx.input.mimeTypeGroup) params.mimetype_group = ctx.input.mimeTypeGroup;
    if (ctx.input.limit !== undefined) params.limit = ctx.input.limit;
    if (ctx.input.skip !== undefined) params.skip = ctx.input.skip;
    mergeQuery(params, ctx.input.queryParams);

    let result = await client.getAssets(params);
    let items = result.items;

    let assets = items.map((item: any) => {
      let fields = item.fields || {};
      let fileField = fields.file;
      let locales = fileField ? Object.keys(fileField) : [];
      let firstLocale = ctx.input.locale ?? (locales.length === 1 ? locales[0] : undefined);
      let file = firstLocale ? fileField[firstLocale] : undefined;

      return {
        assetId: item.sys?.id,
        fileLocales: locales,
        title: fields.title,
        description: fields.description,
        fileName: file?.fileName,
        contentType: file?.contentType,
        url: file?.url,
        size: file?.details?.size,
        width: file?.details?.image?.width,
        height: file?.details?.image?.height,
        version: item.sys?.version,
        createdAt: item.sys?.createdAt,
        updatedAt: item.sys?.updatedAt
      };
    });

    return {
      output: {
        ...pageInfo(result),
        total: result.total,
        skip: result.skip,
        limit: result.limit,
        assets
      },
      message: `Found **${result.total}** assets (showing ${assets.length}).`
    };
  })
  .build();
