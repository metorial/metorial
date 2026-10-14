import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let getJobItem = SlateTool.create(spec, {
  name: 'Get Job Item',
  key: 'get_job_item',
  description:
    'Retrieve a job item and optionally its user assignments, role assignments, and checklist sub-items. User assignment IDs can be used as jobItemUserId when logging time.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      jobItemId: z
        .number()
        .int()
        .positive()
        .describe('Job item ID. Call get_job with includeItems to discover item IDs.'),
      includeUsers: z
        .boolean()
        .optional()
        .describe('Fetch user assignment IDs and user IDs for logging time'),
      includeRoles: z.boolean().optional().describe('Fetch the role assignments'),
      includeSubItems: z.boolean().optional().describe('Fetch checklist sub-items')
    })
  )
  .output(
    z.object({
      jobItemId: z.number(),
      raw: z.record(z.string(), z.any()),
      users: z.array(z.record(z.string(), z.any())).optional(),
      roles: z.array(z.record(z.string(), z.any())).optional(),
      subItems: z.array(z.record(z.string(), z.any())).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });
    let raw = await client.getJobItem(ctx.input.jobItemId);
    let users = ctx.input.includeUsers
      ? await client.listJobItemUsers(ctx.input.jobItemId)
      : undefined;
    let roles = ctx.input.includeRoles
      ? await client.listJobItemRoles(ctx.input.jobItemId)
      : undefined;
    let subItems = ctx.input.includeSubItems
      ? await client.listJobItemSubItems(ctx.input.jobItemId)
      : undefined;
    return {
      output: { jobItemId: raw.id, raw, users, roles, subItems },
      message: `Retrieved job item ${raw.id}.`
    };
  })
  .build();
