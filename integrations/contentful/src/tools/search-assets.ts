import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
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
      limit: z
        .number()
        .optional()
        .describe('Max number of assets to return (1-1000, default 100).'),
      skip: z.number().optional().describe('Number of assets to skip for pagination.')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching assets.'),
      skip: z.number().describe('Number of assets skipped.'),
      limit: z.number().describe('Max assets returned.'),
      assets: z.array(
        z.object({
          assetId: z.string(),
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
    let client = createClient(ctx.config, ctx.auth);

    let params: Record<string, string | number | boolean> = {};
    if (ctx.input.mimeTypeGroup) params.mimetype_group = ctx.input.mimeTypeGroup;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.skip) params.skip = ctx.input.skip;
    if (ctx.input.queryParams) {
      for (let [key, value] of Object.entries(ctx.input.queryParams)) {
        params[key] = value;
      }
    }

    let result = await client.getAssets(params);
    let items = result.items || [];

    // Extract file info from the first locale available
    let assets = items.map((item: any) => {
      let fields = item.fields || {};
      let fileField = fields.file;
      let firstLocale = fileField ? Object.keys(fileField)[0] : undefined;
      let file = firstLocale ? fileField[firstLocale] : undefined;

      return {
        assetId: item.sys?.id,
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
        total: result.total || 0,
        skip: result.skip || 0,
        limit: result.limit || 100,
        assets
      },
      message: `Found **${result.total || 0}** assets (showing ${assets.length}).`
    };
  })
  .build();
