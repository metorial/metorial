import { SlateTool } from 'slates';
import { z } from 'zod';
import { TaskRouterClient } from '../lib/taskrouter-client';
import { fail, validateInput } from '../lib/validation';
import { spec } from '../spec';

let workerSchema = z.object({
  workerSid: z.string().describe('Worker SID'),
  friendlyName: z.string().optional().describe('Friendly name'),
  activityName: z.string().optional().describe('Current activity name'),
  available: z.boolean().optional().describe('Whether the worker is available'),
  attributes: z.string().optional().describe('Worker attributes as JSON string'),
  dateCreated: z.string().optional().describe('Date created'),
  dateUpdated: z.string().optional().describe('Date last updated')
});

export let manageWorkersTool = SlateTool.create(spec, {
  name: 'Manage Workers',
  key: 'manage_workers',
  description: `Create, read, update, delete, or list workers (agents) in a TaskRouter workspace. Workers represent the agents who handle tasks in your Flex contact center. You can update their attributes and current activity. Activity availability determines whether they can accept tasks.`,
  instructions: [
    'Worker attributes must be a valid JSON string.',
    "Use the activitySid to change a worker's current activity/status."
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      pageToken: z
        .string()
        .optional()
        .describe(
          'Opaque continuation from nextPageToken; retain the same resource and filters.'
        ),
      action: z
        .enum(['create', 'get', 'update', 'delete', 'list'])
        .describe('Action to perform'),
      workspaceSid: z
        .string()
        .describe('Workspace SID. Call list_workspaces to discover authorized workspaces.'),
      workerSid: z.string().optional().describe('Worker SID (required for get/update/delete)'),
      friendlyName: z.string().optional().describe('Friendly name for the worker'),
      activitySid: z.string().optional().describe('Activity SID to set as current activity'),
      attributes: z.string().optional().describe('Worker attributes as JSON string'),
      targetWorkersExpression: z
        .string()
        .optional()
        .describe('Filter expression when listing workers (e.g., "skills HAS \'support\'")'),
      pageSize: z.number().optional().describe('Number of results to return (max 1000)')
    })
  )
  .output(
    z.object({
      nextPageToken: z
        .string()
        .optional()
        .describe('Native continuation; omitted when this page is exhausted.'),
      hasMore: z.boolean().optional().describe('Whether a next page is available.'),
      workers: z.array(workerSchema).describe('Worker records')
    })
  )
  .handleInvocation(async ctx => {
    validateInput('manage_workers', ctx.input);
    let client = new TaskRouterClient(
      ctx.auth.token,
      ctx.auth.accountSid,
      ctx.input.pageToken
    );

    if (ctx.input.action === 'list') {
      let params: Record<string, string | undefined> = {
        PageSize: String(ctx.input.pageSize ?? 50)
      };
      if (ctx.input.targetWorkersExpression !== undefined) {
        params.TargetWorkersExpression = ctx.input.targetWorkersExpression;
      }
      if (ctx.input.friendlyName !== undefined) {
        params.FriendlyName = ctx.input.friendlyName;
      }
      if (ctx.input.activitySid) {
        params.ActivitySid = ctx.input.activitySid;
      }
      let result = await client.listWorkers(ctx.input.workspaceSid, params);
      let workers = (result.workers || []).map((w: any) => ({
        workerSid: w.sid,
        friendlyName: w.friendly_name,
        activityName: w.activity_name,
        available: w.available,
        attributes: w.attributes,
        dateCreated: w.date_created,
        dateUpdated: w.date_updated
      }));
      return {
        output: { workers, nextPageToken: result.nextPageToken, hasMore: result.hasMore },
        message: `Found **${workers.length}** workers in workspace.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.workerSid) throw fail('workerSid is required');
      let w = await client.getWorker(ctx.input.workspaceSid, ctx.input.workerSid);
      return {
        output: {
          workers: [
            {
              workerSid: w.sid,
              friendlyName: w.friendly_name,
              activityName: w.activity_name,
              available: w.available,
              attributes: w.attributes,
              dateCreated: w.date_created,
              dateUpdated: w.date_updated
            }
          ]
        },
        message: `Worker **${w.friendly_name}** (${w.sid}) is currently **${w.activity_name}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.friendlyName) throw fail('friendlyName is required to create a worker');
      let params: Record<string, string | undefined> = {
        FriendlyName: ctx.input.friendlyName,
        ActivitySid: ctx.input.activitySid,
        Attributes: ctx.input.attributes
      };
      let w = await client.createWorker(ctx.input.workspaceSid, params);
      return {
        output: {
          workers: [
            {
              workerSid: w.sid,
              friendlyName: w.friendly_name,
              activityName: w.activity_name,
              available: w.available,
              attributes: w.attributes,
              dateCreated: w.date_created,
              dateUpdated: w.date_updated
            }
          ]
        },
        message: `Created worker **${w.friendly_name}** (${w.sid}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.workerSid) throw fail('workerSid is required');
      let params: Record<string, string | undefined> = {
        FriendlyName: ctx.input.friendlyName,
        ActivitySid: ctx.input.activitySid,
        Attributes: ctx.input.attributes
      };
      let w = await client.updateWorker(ctx.input.workspaceSid, ctx.input.workerSid, params);
      return {
        output: {
          workers: [
            {
              workerSid: w.sid,
              friendlyName: w.friendly_name,
              activityName: w.activity_name,
              available: w.available,
              attributes: w.attributes,
              dateCreated: w.date_created,
              dateUpdated: w.date_updated
            }
          ]
        },
        message: `Updated worker **${w.friendly_name}** (${w.sid}).`
      };
    }

    // delete
    if (!ctx.input.workerSid) throw fail('workerSid is required');
    await client.deleteWorker(ctx.input.workspaceSid, ctx.input.workerSid);
    return {
      output: {
        workers: [
          {
            workerSid: ctx.input.workerSid
          }
        ]
      },
      message: `Deleted worker **${ctx.input.workerSid}**.`
    };
  })
  .build();
