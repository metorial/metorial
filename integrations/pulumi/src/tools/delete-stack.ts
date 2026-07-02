import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteStack = SlateTool.create(spec, {
  name: 'Delete Stack',
  key: 'delete_stack',
  description: `Delete a Pulumi stack. Use \`force\` to delete even if resources still exist in the stack.`,
  tags: {
    destructive: true
  },
  constraints: [
    'Force-deleting a stack with remaining resources will orphan those resources — they will no longer be tracked by Pulumi.'
  ]
})
  .input(
    z.object({
      organization: z
        .string()
        .optional()
        .describe('Organization name (uses default from config if not set)'),
      projectName: z.string().describe('Project name'),
      stackName: z.string().describe('Stack name to delete'),
      force: z
        .boolean()
        .optional()
        .describe('Force deletion even if resources remain in the stack')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let org = ctx.input.organization || ctx.config.organization;
    if (!org)
      throw new Error('Organization is required. Set it in config or provide it as input.');

    await client.deleteStack(org, ctx.input.projectName, ctx.input.stackName, ctx.input.force);

    return {
      output: { deleted: true },
      message: `Deleted stack **${org}/${ctx.input.projectName}/${ctx.input.stackName}**${ctx.input.force ? ' (forced)' : ''}`
    };
  })
  .build();
