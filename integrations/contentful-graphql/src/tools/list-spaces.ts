import { SlateTool } from 'slates';
import { z } from 'zod';
import { listAccountSpaces } from '../lib/client';
import { spaceListInputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listSpaces = SlateTool.create(spec, {
  name: 'List Spaces',
  key: 'list_spaces',
  description:
    'Discover space IDs and names accessible to the optional Content Management API token. Results describe CMA account access; they do not prove that the delivery or preview token authorizes the same space or environment.',
  instructions: [
    'Requires an optional managementToken. Without one, copy the space ID authorized by your delivery or preview key from API-key settings.',
    'Read one page at a time using offset skip or native cursor=true and pageNext/pagePrev. Keep cursor filters unchanged.'
  ],
  tags: { readOnly: true }
})
  .input(spaceListInputSchema)
  .output(
    z.object({
      spaces: z.array(
        z.object({ id: z.string(), name: z.string(), organizationId: z.string().optional() })
      ),
      pagination: z.enum(['offset', 'cursor']),
      skip: z.number().optional(),
      limit: z.number().optional(),
      total: z.number().optional(),
      pages: z.object({ next: z.string().optional(), prev: z.string().optional() }).optional()
    })
  )
  .handleInvocation(async ctx => ({
    output: await listAccountSpaces(ctx.config, ctx.auth, ctx.input),
    message:
      'Returned one page of CMA-accessible spaces. Verify the selected space and environment against delivery or preview key settings before querying content.'
  }))
  .build();
