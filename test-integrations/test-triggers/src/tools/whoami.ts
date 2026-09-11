import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let whoami = SlateTool.create(spec, {
  key: 'whoami',
  name: 'Who Am I',
  description: 'Returns the authenticated account and workspace used for trigger routing.',
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.string(),
      workspaceId: z.string()
    })
  )
  .handleInvocation(async ctx => ({
    output: {
      accountId: ctx.auth.accountId,
      workspaceId: ctx.config.workspaceId
    },
    message: `Authenticated as account **${ctx.auth.accountId}** in workspace **${ctx.config.workspaceId}**.`
  }))
  .build();
