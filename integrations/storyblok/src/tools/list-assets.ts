import { SlateTool } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
import { spec } from '../spec';

export let listAssets = SlateTool.create(spec, {
  name: 'List Assets',
  key: 'list_assets',
  description: `Search and list media assets in the space. Filter by search term, folder, or privacy status. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Assets per page (default: 25)'),
      search: z.string().optional().describe('Search term to filter assets by filename'),
      inFolder: z.number().optional().describe('Filter by asset folder ID'),
      isPrivate: z.boolean().optional().describe('Filter by privacy status')
    })
  )
  .output(
    z.object({
      assets: z
        .array(
          z.object({
            assetId: z.number().optional().describe('Numeric ID of the asset'),
            filename: z.string().optional().describe('Full URL of the asset'),
            name: z.string().optional().describe('Display name'),
            contentType: z.string().optional().describe('MIME type'),
            contentLength: z.number().optional().describe('File size in bytes'),
            alt: z.string().optional().describe('Alt text'),
            title: z.string().optional().describe('Title'),
            isPrivate: z.boolean().optional().describe('Whether asset is private'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of assets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StoryblokClient({
      token: ctx.auth.token,
      region: ctx.auth.region,
      spaceId: ctx.config.spaceId
    });

    let result = await client.listAssets({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      search: ctx.input.search,
      inFolder: ctx.input.inFolder,
      isPrivate: ctx.input.isPrivate
    });

    let assets = result.assets.map(a => ({
      assetId: a.id,
      filename: a.filename,
      name: a.name,
      contentType: a.content_type,
      contentLength: a.content_length,
      alt: a.alt,
      title: a.title,
      isPrivate: a.is_private,
      createdAt: a.created_at
    }));

    return {
      output: { assets },
      message: `Found **${assets.length}** assets.`
    };
  })
  .build();
