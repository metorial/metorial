import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getGroup = SlateTool.create(spec, {
  name: 'Get Group',
  key: 'get_group',
  description:
    'Read a Hex group by its ID. Member details are not included in this API response.',
  tags: { readOnly: true }
})
  .input(z.object({ groupId: z.string().describe('Group UUID discovered with List Groups') }))
  .output(z.object({ groupId: z.string(), name: z.string(), createdAt: z.string() }))
  .handleInvocation(async ctx => {
    const output = await new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl
    }).getGroup(ctx.input.groupId);
    return { output, message: `Retrieved group **${output.name}**.` };
  })
  .build();
