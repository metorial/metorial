import { SlateTool } from 'slates';
import { z } from 'zod';
import { AssetApiClient } from '../lib/client';
import { spec } from '../spec';

let assetOutputSchema = z.object({
  assetId: z.string().describe('Unique asset ID'),
  url: z.string().describe('Public URL of the asset (served via imgix for images)'),
  filename: z.string().describe('Original filename'),
  extension: z.string().describe('File extension'),
  size: z.number().describe('File size in bytes'),
  kind: z.string().describe('Asset kind (image, document, video)'),
  width: z.number().optional().describe('Image width in pixels'),
  height: z.number().optional().describe('Image height in pixels'),
  notes: z.string().optional().describe('Internal notes'),
  credits: z.string().optional().describe('Attribution/credits'),
  alt: z.string().optional().describe('Alternative text for accessibility'),
  tags: z.array(z.string()).optional().describe('Asset tag names'),
  lastModified: z.number().describe('Last modified timestamp'),
  createdAt: z.number().describe('Creation timestamp')
});

export let listAssets = SlateTool.create(spec, {
  name: 'List Assets',
  key: 'list_assets',
  description: `List and search assets in the Prismic media library. Supports filtering by type, keyword, tags, and cursor-based pagination.
Requires a Write API token.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      assetType: z
        .enum(['image', 'document', 'video'])
        .optional()
        .describe('Filter by asset type'),
      keyword: z.string().optional().describe('Search keyword to filter assets'),
      tags: z.array(z.string()).optional().describe('Filter by asset tag names'),
      ids: z.array(z.string()).optional().describe('Filter by specific asset IDs'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      assets: z.array(assetOutputSchema).describe('List of assets'),
      total: z.number().describe('Total number of matching assets'),
      cursor: z.string().optional().describe('Cursor for next page of results')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.writeToken) {
      throw new Error('Write API token is required for managing assets.');
    }

    let client = new AssetApiClient({
      repositoryName: ctx.config.repositoryName,
      writeToken: ctx.auth.writeToken
    });

    let result = await client.listAssets({
      assetType: ctx.input.assetType,
      keyword: ctx.input.keyword,
      tags: ctx.input.tags,
      ids: ctx.input.ids,
      cursor: ctx.input.cursor,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        assets: result.results.map(a => ({
          assetId: a.id,
          url: a.url,
          filename: a.filename,
          extension: a.extension,
          size: a.size,
          kind: a.kind,
          width: a.width,
          height: a.height,
          notes: a.notes,
          credits: a.credits,
          alt: a.alt,
          tags: a.tags?.map(t => t.name),
          lastModified: a.last_modified,
          createdAt: a.created_at
        })),
        total: result.total,
        cursor: result.cursor
      },
      message: `Found **${result.total}** assets (returning ${result.results.length}).`
    };
  })
  .build();

export let uploadAsset = SlateTool.create(spec, {
  name: 'Upload Asset',
  key: 'upload_asset',
  description: `Upload a new asset to the Prismic media library from a public URL. Supports images (PNG, JPEG, WEBP, GIF up to 10MB) and other files (up to 100MB).
Requires a Write API token.`,
  constraints: [
    'Images must be PNG, JPEG, WEBP, GIF, JPE, JPG, ICO, or JFIF format, max 10MB.',
    'Other files including videos can be up to 100MB.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      url: z.string().describe('Public URL of the file to upload'),
      filename: z.string().describe('Filename for the uploaded asset'),
      notes: z.string().optional().describe('Internal notes about the asset'),
      credits: z.string().optional().describe('Attribution/credits text'),
      alt: z.string().optional().describe('Alternative text for accessibility'),
      tags: z.array(z.string()).optional().describe('Tags to apply to the asset')
    })
  )
  .output(assetOutputSchema)
  .handleInvocation(async ctx => {
    if (!ctx.auth.writeToken) {
      throw new Error('Write API token is required for managing assets.');
    }

    let client = new AssetApiClient({
      repositoryName: ctx.config.repositoryName,
      writeToken: ctx.auth.writeToken
    });

    let a = await client.uploadAsset({
      url: ctx.input.url,
      filename: ctx.input.filename,
      notes: ctx.input.notes,
      credits: ctx.input.credits,
      alt: ctx.input.alt,
      tags: ctx.input.tags
    });

    return {
      output: {
        assetId: a.id,
        url: a.url,
        filename: a.filename,
        extension: a.extension,
        size: a.size,
        kind: a.kind,
        width: a.width,
        height: a.height,
        notes: a.notes,
        credits: a.credits,
        alt: a.alt,
        tags: a.tags?.map(t => t.name),
        lastModified: a.last_modified,
        createdAt: a.created_at
      },
      message: `Uploaded asset **${a.filename}** (${a.id}).`
    };
  })
  .build();

export let updateAsset = SlateTool.create(spec, {
  name: 'Update Asset',
  key: 'update_asset',
  description: `Update metadata for an existing asset in the Prismic media library, such as alt text, notes, credits, or tags.
Requires a Write API token.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      assetId: z.string().describe('ID of the asset to update'),
      notes: z.string().optional().describe('Updated internal notes'),
      credits: z.string().optional().describe('Updated attribution/credits'),
      alt: z.string().optional().describe('Updated alternative text'),
      tags: z.array(z.string()).optional().describe('Updated tags (replaces existing tags)')
    })
  )
  .output(assetOutputSchema)
  .handleInvocation(async ctx => {
    if (!ctx.auth.writeToken) {
      throw new Error('Write API token is required for managing assets.');
    }

    let client = new AssetApiClient({
      repositoryName: ctx.config.repositoryName,
      writeToken: ctx.auth.writeToken
    });

    let a = await client.updateAsset(ctx.input.assetId, {
      notes: ctx.input.notes,
      credits: ctx.input.credits,
      alt: ctx.input.alt,
      tags: ctx.input.tags
    });

    return {
      output: {
        assetId: a.id,
        url: a.url,
        filename: a.filename,
        extension: a.extension,
        size: a.size,
        kind: a.kind,
        width: a.width,
        height: a.height,
        notes: a.notes,
        credits: a.credits,
        alt: a.alt,
        tags: a.tags?.map(t => t.name),
        lastModified: a.last_modified,
        createdAt: a.created_at
      },
      message: `Updated asset **${a.filename}** (${a.id}).`
    };
  })
  .build();

export let deleteAsset = SlateTool.create(spec, {
  name: 'Delete Asset',
  key: 'delete_asset',
  description: `Delete an asset from the Prismic media library. This action is irreversible.
Requires a Write API token.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      assetId: z.string().describe('ID of the asset to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the asset was successfully deleted'),
      assetId: z.string().describe('ID of the deleted asset')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.writeToken) {
      throw new Error('Write API token is required for managing assets.');
    }

    let client = new AssetApiClient({
      repositoryName: ctx.config.repositoryName,
      writeToken: ctx.auth.writeToken
    });

    await client.deleteAsset(ctx.input.assetId);

    return {
      output: {
        deleted: true,
        assetId: ctx.input.assetId
      },
      message: `Deleted asset **${ctx.input.assetId}**.`
    };
  })
  .build();
