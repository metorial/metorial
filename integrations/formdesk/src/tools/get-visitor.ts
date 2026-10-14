import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { FormdeskClient } from '../lib/client';
import { spec } from '../spec';

export let getVisitor = SlateTool.create(spec, {
  name: 'Get Visitor',
  key: 'get_visitor',
  description:
    'Retrieves a visitor profile by ID. Call list_visitors to discover visitor IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ visitorId: z.string().describe('Visitor ID from list_visitors') }))
  .output(
    z.object({
      visitorId: z.string(),
      name: z.string().optional(),
      email: z.string().optional(),
      username: z.string().optional(),
      active: z.boolean().optional(),
      type: z.string().optional(),
      externalUserId: z.string().optional(),
      externalProvider: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FormdeskClient(ctx.auth);
    let visitor = await client.getVisitor(ctx.input.visitorId);
    if (visitor?.id === undefined || visitor.id === null) {
      throw createApiServiceError('Formdesk did not return a visitor ID.');
    }
    return {
      output: {
        visitorId: String(visitor.id),
        name: typeof visitor.name === 'string' ? visitor.name : undefined,
        email: typeof visitor.email === 'string' ? visitor.email : undefined,
        username: typeof visitor.username === 'string' ? visitor.username : undefined,
        active: typeof visitor.active === 'boolean' ? visitor.active : undefined,
        type: typeof visitor.type === 'string' ? visitor.type : undefined,
        externalUserId:
          typeof visitor.external_userid === 'string' ? visitor.external_userid : undefined,
        externalProvider:
          typeof visitor.external_provider === 'string' ? visitor.external_provider : undefined
      },
      message: `Retrieved visitor **${visitor.id}**.`
    };
  })
  .build();
