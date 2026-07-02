import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, extractMediaSummary } from '../lib/helpers';
import { spec } from '../spec';

let mediaOutputSchema = z.object({
  mediaId: z.string().describe('Unique identifier of the media item'),
  title: z.string().describe('Media title'),
  url: z.string().describe('Direct URL to the media file'),
  mimeType: z.string().describe('MIME type of the file'),
  caption: z.string().describe('Media caption'),
  altText: z.string().describe('Alternative text for accessibility'),
  description: z.string().describe('Media description'),
  date: z.string().describe('Upload date'),
  width: z.number().describe('Width in pixels (0 for non-image files)'),
  height: z.number().describe('Height in pixels (0 for non-image files)')
});

export let listMediaTool = SlateTool.create(spec, {
  name: 'List Media',
  key: 'list_media',
  description: `Browse the site's media library. Filter by media type (image, video, audio, application) or search by keyword. Results are paginated.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mediaType: z
        .string()
        .optional()
        .describe('Filter by media type (image, video, audio, application)'),
      search: z.string().optional().describe('Search media by keyword'),
      perPage: z.number().optional().describe('Number of items per page (default: 20)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      media: z.array(mediaOutputSchema),
      count: z.number().describe('Number of media items returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let media = await client.listMedia(ctx.input);
    let results = media.map((m: any) => extractMediaSummary(m, ctx.config.apiType));
    return {
      output: {
        media: results,
        count: results.length
      },
      message: `Found **${results.length}** media item(s)${ctx.input.mediaType ? ` of type "${ctx.input.mediaType}"` : ''}.`
    };
  })
  .build();

export let getMediaTool = SlateTool.create(spec, {
  name: 'Get Media',
  key: 'get_media',
  description: `Retrieve details of a single media item by its ID, including URL, dimensions, caption, and alt text.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mediaId: z.string().describe('ID of the media item to retrieve')
    })
  )
  .output(mediaOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let media = await client.getMedia(ctx.input.mediaId);
    let result = extractMediaSummary(media, ctx.config.apiType);
    return {
      output: result,
      message: `Retrieved media **"${result.title}"** (${result.mimeType}). [View](${result.url})`
    };
  })
  .build();

export let updateMediaTool = SlateTool.create(spec, {
  name: 'Update Media',
  key: 'update_media',
  description: `Update metadata of an existing media item including title, caption, alt text, and description. Only provided fields are updated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mediaId: z.string().describe('ID of the media item to update'),
      title: z.string().optional().describe('New title'),
      caption: z.string().optional().describe('New caption'),
      altText: z.string().optional().describe('New alternative text'),
      description: z.string().optional().describe('New description')
    })
  )
  .output(mediaOutputSchema)
  .handleInvocation(async ctx => {
    let { mediaId, ...updateData } = ctx.input;
    let client = createClient(ctx.config, ctx.auth);
    let media = await client.updateMedia(mediaId, updateData);
    let result = extractMediaSummary(media, ctx.config.apiType);
    return {
      output: result,
      message: `Updated media **"${result.title}"** (ID: ${result.mediaId}).`
    };
  })
  .build();

export let deleteMediaTool = SlateTool.create(spec, {
  name: 'Delete Media',
  key: 'delete_media',
  description: `Permanently delete a media item from the library. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      mediaId: z.string().describe('ID of the media item to delete')
    })
  )
  .output(
    z.object({
      mediaId: z.string().describe('ID of the deleted media item'),
      deleted: z.boolean().describe('Whether the media was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteMedia(ctx.input.mediaId);
    return {
      output: {
        mediaId: ctx.input.mediaId,
        deleted: true
      },
      message: `Deleted media item **${ctx.input.mediaId}**.`
    };
  })
  .build();
