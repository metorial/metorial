import { SlateTool } from 'slates';
import { z } from 'zod';
import { EditClient } from '../lib/client';
import { spec } from '../spec';

export let getRenderTool = SlateTool.create(spec, {
  name: 'Get Render Status',
  key: 'get_render',
  description: `Check the status and details of a render job. Returns the current status, output URL (when complete), poster and thumbnail URLs, and timing information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      renderId: z.string().describe('The render job ID returned from the Render Video tool'),
      includeEditData: z
        .boolean()
        .optional()
        .describe('Include the original edit JSON data in the response'),
      includeMergedData: z
        .boolean()
        .optional()
        .describe('Include the merged field values in the response')
    })
  )
  .output(
    z.object({
      renderId: z.string().describe('The render job ID'),
      status: z
        .enum(['queued', 'fetching', 'rendering', 'saving', 'done', 'failed'])
        .describe('Current render status'),
      url: z
        .string()
        .optional()
        .describe('Temporary output URL (available when done, expires after 24 hours)'),
      posterUrl: z.string().optional().describe('Poster image URL if requested'),
      thumbnailUrl: z.string().optional().describe('Thumbnail image URL if requested'),
      owner: z.string().optional().describe('Account owner ID'),
      created: z.string().optional().describe('Creation timestamp'),
      updated: z.string().optional().describe('Last update timestamp'),
      editData: z.any().optional().describe('Original edit data if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EditClient(ctx.auth.token, ctx.config.environment);

    let result = await client.getRender(ctx.input.renderId, {
      data: ctx.input.includeEditData,
      merged: ctx.input.includeMergedData
    });

    let response = result.response;

    return {
      output: {
        renderId: response.id,
        status: response.status,
        url: response.url || undefined,
        posterUrl: response.poster || undefined,
        thumbnailUrl: response.thumbnail || undefined,
        owner: response.owner,
        created: response.created,
        updated: response.updated,
        editData: response.data || undefined
      },
      message: `Render **${response.id}** is **${response.status}**${response.url ? `. Output: ${response.url}` : '.'}`
    };
  })
  .build();
