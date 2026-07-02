import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let transferResource = SlateTool.create(spec, {
  name: 'Transfer Resource',
  key: 'transfer_resource',
  description: `Transfer a workflow or credential to a different project. Useful for reorganizing resources across projects.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['workflow', 'credential'])
        .describe('Type of resource to transfer'),
      resourceId: z.string().describe('ID of the workflow or credential to transfer'),
      destinationProjectId: z
        .string()
        .describe('ID of the project to transfer the resource to')
    })
  )
  .output(
    z.object({
      transferred: z.boolean().describe('Whether the transfer was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    if (ctx.input.resourceType === 'workflow') {
      await client.transferWorkflow(ctx.input.resourceId, ctx.input.destinationProjectId);
    } else {
      await client.transferCredential(ctx.input.resourceId, ctx.input.destinationProjectId);
    }

    return {
      output: {
        transferred: true
      },
      message: `Transferred ${ctx.input.resourceType} **${ctx.input.resourceId}** to project **${ctx.input.destinationProjectId}**.`
    };
  })
  .build();
