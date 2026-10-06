import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, connectionApiBaseUrl, organization } from '../lib/client';
import { organizationInput } from '../lib/schemas';
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
      organization: organizationInput,
      projectName: z.string().describe('Project name'),
      stackName: z.string().describe('Stack name'),
      page: z.number().optional().describe('Nonnegative page number; 0 retrieves all history'),
      pageSize: z
        .number()
        .optional()
        .describe('Nonnegative results per page; ignored when page is 0')
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
      baseUrl: connectionApiBaseUrl(ctx.auth, ctx.config)
    });

    let org = organization(ctx.input.organization, ctx.config.organization);

    let result = await client.listStackUpdates(
      org,
      ctx.input.projectName,
      ctx.input.stackName,
      {
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      }
    );

    let updates = result.updates.map(u => ({
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
