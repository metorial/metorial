import { SlateTool } from 'slates';
import { z } from 'zod';
import { ControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let listRegulations = SlateTool.create(spec, {
  name: 'List Regulations',
  key: 'list_regulations',
  description: `Retrieve all user suppression regulations created via the User Suppression API. Useful for reviewing compliance actions and managing existing regulations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      afterCursor: z
        .string()
        .optional()
        .describe('Opaque cursor from the previous response; preserve the same filters.'),
      limit: z.number().optional().describe('Maximum number of regulations to return'),
      offset: z.number().optional().describe('Number of regulations to skip')
    })
  )
  .output(
    z.object({
      nextCursor: z.string().optional().describe('Cursor for the next request.'),
      nextOffset: z
        .number()
        .optional()
        .describe('Offset to use with nextCursor for a continuation within a provider page.'),
      hasMore: z.boolean().optional().describe('Whether more regulations are available.'),
      regulations: z.array(z.record(z.string(), z.unknown())).describe('List of regulations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ControlPlaneClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.listRegulations(ctx.input);
    return {
      output: {
        regulations: result.data,
        nextCursor: result.nextCursor,
        nextOffset: result.nextOffset,
        hasMore: result.hasMore
      },
      message: `Retrieved ${result.data.length} regulation(s). Cancellation records remain in history.`
    };
  })
  .build();
