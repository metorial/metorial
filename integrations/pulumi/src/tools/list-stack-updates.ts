import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listStackUpdates = SlateTool.create(spec, {
  name: 'List Stack Updates',
  key: 'list_stack_updates',
  description: `List the update history for a Pulumi stack. Shows past operations (update, preview, destroy, refresh) with their results, resource changes, and timing.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organization: z
        .string()
        .optional()
        .describe('Organization name (uses default from config if not set)'),
      projectName: z.string().describe('Project name'),
      stackName: z.string().describe('Stack name'),
      page: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      updates: z.array(
        z.object({
          version: z.number().optional(),
          kind: z.string().optional(),
          result: z.string().optional(),
          message: z.string().optional(),
          startTime: z.number().optional(),
          endTime: z.number().optional(),
          resourceChanges: z.record(z.string(), z.number()).optional(),
          resourceCount: z.number().optional()
        })
      )
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

    let result = await client.listStackUpdates(
      org,
      ctx.input.projectName,
      ctx.input.stackName,
      {
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      }
    );

    let updates = (result.updates || []).map((u: any) => ({
      version: u.version,
      kind: u.kind,
      result: u.result,
      message: u.message,
      startTime: u.startTime,
      endTime: u.endTime,
      resourceChanges: u.resourceChanges,
      resourceCount: u.resourceCount
    }));

    return {
      output: { updates },
      message: `Found **${updates.length}** update(s) for stack **${org}/${ctx.input.projectName}/${ctx.input.stackName}**`
    };
  })
  .build();
