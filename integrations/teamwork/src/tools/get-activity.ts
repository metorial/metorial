import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getActivity = SlateTool.create(spec, {
  name: 'Get Activity',
  key: 'get_activity',
  description: `Retrieve the latest activity feed from Teamwork. Shows recent actions across the site or within a specific project, including task updates, comments, file uploads, and more.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Filter activity by project ID. Omit to get site-wide activity.'),
      page: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      activities: z
        .array(
          z.object({
            activityId: z.string().describe('Activity entry ID'),
            activityType: z.string().optional().describe('Type of activity'),
            description: z.string().optional().describe('Human-readable description'),
            itemId: z.string().optional().describe('ID of the affected item'),
            itemLink: z.string().optional().describe('Link to the affected item'),
            projectId: z.string().optional().describe('Project ID'),
            projectName: z.string().optional().describe('Project name'),
            userId: z.string().optional().describe('User who performed the action'),
            userName: z.string().optional().describe('Name of the user'),
            dateTime: z.string().optional().describe('When the activity occurred')
          })
        )
        .describe('List of activity entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = ctx.input.projectId
      ? await client.getProjectActivity(ctx.input.projectId, {
          page: ctx.input.page,
          pageSize: ctx.input.pageSize
        })
      : await client.getLatestActivity({ page: ctx.input.page, pageSize: ctx.input.pageSize });

    let activities = (result.activity || result.activities || []).map((a: any) => ({
      activityId: String(a.id),
      activityType: a.activitytype || a.type || undefined,
      description: a.description || undefined,
      itemId: a.itemid ? String(a.itemid) : a.itemId ? String(a.itemId) : undefined,
      itemLink: a.itemlink || a.link || undefined,
      projectId: a['project-id']
        ? String(a['project-id'])
        : a.projectId
          ? String(a.projectId)
          : undefined,
      projectName: a['project-name'] || a.projectName || undefined,
      userId: a.userid ? String(a.userid) : a.userId ? String(a.userId) : undefined,
      userName: a['from-user-avatar-url']
        ? undefined
        : a['user-name'] || a.userName || undefined,
      dateTime: a.datetime || a.dateTime || undefined
    }));

    return {
      output: { activities },
      message: `Found **${activities.length}** activity entries.`
    };
  })
  .build();
