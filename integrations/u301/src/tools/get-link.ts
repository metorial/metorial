import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getLinkSchema, workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getLink = SlateTool.create(spec, {
  name: 'Get Link',
  key: 'get_link',
  description:
    'Retrieve a short link by domain and slug, including its destination, owner, workspace, timestamps and current state. Call list_workspaces if a workspace ID is needed.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      shortenedLink: z
        .string()
        .describe('Short link as domain/slug without a protocol, for example u301.co/abc123.'),
      workspaceId: workspaceIdSchema.optional()
    })
  )
  .output(z.object({ link: getLinkSchema }))
  .handleInvocation(async ctx => {
    let link = await new Client({ token: ctx.auth.token }).getLink(
      ctx.input.shortenedLink,
      ctx.input.workspaceId
    );
    return { output: { link }, message: `Retrieved **${link.shortUrl}**.` };
  })
  .build();
