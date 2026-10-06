import { SlateTool } from 'slates';
import { z } from 'zod';
import { TaskRouterClient } from '../lib/taskrouter-client';
import { fail, validateInput } from '../lib/validation';
import { spec } from '../spec';

let activitySchema = z.object({
  activitySid: z.string().describe('Activity SID'),
  friendlyName: z.string().optional().describe('Friendly name'),
  available: z
    .boolean()
    .optional()
    .describe('Whether workers in this activity are available for task assignment'),
  dateCreated: z.string().optional().describe('Date created'),
  dateUpdated: z.string().optional().describe('Date updated')
});

export let manageActivitiesTool = SlateTool.create(spec, {
  name: 'Manage Activities',
  key: 'manage_activities',
  description: `Create, read, update, delete, or list activities in a TaskRouter workspace. Activities describe what workers are doing (e.g., "Available", "Break", "Offline") and whether they are eligible to receive new task assignments.`,
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
      activitySid: z
        .string()
        .optional()
        .describe('Activity SID (required for get/update/delete)'),
      friendlyName: z.string().optional().describe('Friendly name'),
      available: z
        .boolean()
        .optional()
        .describe('Whether workers in this activity should be available for task assignment'),
      pageSize: z.number().optional().describe('Number of results to return')
    })
  )
  .output(
    z.object({
      nextPageToken: z
        .string()
        .optional()
        .describe('Native continuation; omitted when this page is exhausted.'),
      hasMore: z.boolean().optional().describe('Whether a next page is available.'),
      activities: z.array(activitySchema).describe('Activity records')
    })
  )
  .handleInvocation(async ctx => {
    validateInput('manage_activities', ctx.input);
    let client = new TaskRouterClient(
      ctx.auth.token,
      ctx.auth.accountSid,
      ctx.input.pageToken
    );

    if (ctx.input.action === 'list') {
      let result = await client.listActivities(ctx.input.workspaceSid, ctx.input.pageSize);
      let activities = (result.activities || []).map((a: any) => ({
        activitySid: a.sid,
        friendlyName: a.friendly_name,
        available: a.available,
        dateCreated: a.date_created,
        dateUpdated: a.date_updated
      }));
      return {
        output: { activities, nextPageToken: result.nextPageToken, hasMore: result.hasMore },
        message: `Found **${activities.length}** activities.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.activitySid) throw fail('activitySid is required');
      let a = await client.getActivity(ctx.input.workspaceSid, ctx.input.activitySid);
      return {
        output: {
          activities: [
            {
              activitySid: a.sid,
              friendlyName: a.friendly_name,
              available: a.available,
              dateCreated: a.date_created,
              dateUpdated: a.date_updated
            }
          ]
        },
        message: `Activity **${a.friendly_name}** — available: **${a.available}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.friendlyName) throw fail('friendlyName is required');
      let params: Record<string, string | undefined> = {
        FriendlyName: ctx.input.friendlyName,
        Available: ctx.input.available?.toString()
      };
      let a = await client.createActivity(ctx.input.workspaceSid, params);
      return {
        output: {
          activities: [
            {
              activitySid: a.sid,
              friendlyName: a.friendly_name,
              available: a.available,
              dateCreated: a.date_created,
              dateUpdated: a.date_updated
            }
          ]
        },
        message: `Created activity **${a.friendly_name}** (${a.sid}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.activitySid) throw fail('activitySid is required');
      let params: Record<string, string | undefined> = {
        FriendlyName: ctx.input.friendlyName
      };
      let a = await client.updateActivity(
        ctx.input.workspaceSid,
        ctx.input.activitySid,
        params
      );
      return {
        output: {
          activities: [
            {
              activitySid: a.sid,
              friendlyName: a.friendly_name,
              available: a.available,
              dateCreated: a.date_created,
              dateUpdated: a.date_updated
            }
          ]
        },
        message: `Updated activity **${a.friendly_name}** (${a.sid}).`
      };
    }

    // delete
    if (!ctx.input.activitySid) throw fail('activitySid is required');
    await client.deleteActivity(ctx.input.workspaceSid, ctx.input.activitySid);
    return {
      output: {
        activities: [
          {
            activitySid: ctx.input.activitySid
          }
        ]
      },
      message: `Deleted activity **${ctx.input.activitySid}**.`
    };
  })
  .build();
