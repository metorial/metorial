import { SlateTool } from 'slates';
import { z } from 'zod';
import { TaskRouterClient } from '../lib/taskrouter-client';
import { validateInput } from '../lib/validation';
import { spec } from '../spec';
export let listWorkspacesTool = SlateTool.create(spec, {
  key: 'list_workspaces',
  name: 'List Workspaces',
  description:
    'Discover authorized TaskRouter workspaces and their native SIDs before managing workers, queues, tasks, workflows or statistics.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      pageSize: z.number().optional().describe('Page size, 1–1000; default 50.'),
      pageToken: z
        .string()
        .optional()
        .describe('Opaque nextPageToken from the preceding page.')
    })
  )
  .output(
    z.object({
      workspaces: z.array(
        z.object({
          workspaceSid: z.string(),
          friendlyName: z.string().optional(),
          accountSid: z.string().optional(),
          multiTaskEnabled: z.boolean().optional(),
          defaultActivitySid: z.string().optional(),
          timeoutActivitySid: z.string().optional(),
          dateCreated: z.string().optional(),
          dateUpdated: z.string().optional()
        })
      ),
      nextPageToken: z.string().optional(),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    validateInput('list_workspaces', ctx.input);
    const result = await new TaskRouterClient(
      ctx.auth.token,
      ctx.auth.accountSid,
      ctx.input.pageToken
    ).listWorkspaces(ctx.input.pageSize);
    const workspaces = result.workspaces.map((w: any) => ({
      workspaceSid: w.sid,
      friendlyName: w.friendly_name,
      accountSid: w.account_sid,
      multiTaskEnabled: w.multi_task_enabled,
      defaultActivitySid: w.default_activity_sid,
      timeoutActivitySid: w.timeout_activity_sid,
      dateCreated: w.date_created,
      dateUpdated: w.date_updated
    }));
    return {
      output: { workspaces, nextPageToken: result.nextPageToken, hasMore: result.hasMore },
      message: `Found ${workspaces.length} authorized workspaces on this page.`
    };
  })
  .build();
