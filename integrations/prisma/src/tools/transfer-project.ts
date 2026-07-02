import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrismaClient } from '../lib/client';
import { spec } from '../spec';

export let transferProject = SlateTool.create(spec, {
  name: 'Transfer Project',
  key: 'transfer_project',
  description: `Transfer a project (including all its databases) to another user's workspace. The recipient must have provided an OAuth access token that grants workspace access. This is typically used in partner provisioning flows.`,
  instructions: [
    'The recipientAccessToken must be an OAuth access token with workspace:admin scope obtained from the recipient user.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to transfer'),
      recipientAccessToken: z
        .string()
        .describe('OAuth access token of the recipient user who will claim the project')
    })
  )
  .output(
    z.object({
      transferred: z.boolean().describe('Whether the transfer was successful'),
      projectId: z.string().describe('ID of the transferred project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrismaClient(ctx.auth.token);

    await client.transferProject({
      projectId: ctx.input.projectId,
      recipientAccessToken: ctx.input.recipientAccessToken
    });

    return {
      output: {
        transferred: true,
        projectId: ctx.input.projectId
      },
      message: `Project **${ctx.input.projectId}** was successfully transferred.`
    };
  })
  .build();
