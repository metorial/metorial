import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let scheduleEntryInput = z.object({
  channelId: z.string().describe('Channel to schedule the post to'),
  content: z.string().optional().describe('Post text content'),
  media: z
    .array(
      z.object({
        mediaId: z.string().describe('Uploaded media file ID'),
        options: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Platform-specific media options')
      })
    )
    .optional()
    .describe('Media attachments'),
  options: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Platform-specific post options')
});

let scheduleGroupResultSchema = z.object({
  scheduleGroupId: z.string().optional().describe('ID of the schedule group'),
  status: z.string().optional().describe('Group status (draft or scheduled)'),
  publishOn: z.string().nullable().optional().describe('Scheduled publish time'),
  scheduleCount: z.number().optional().describe('Number of schedules in the group')
});

export let manageScheduleGroup = SlateTool.create(spec, {
  name: 'Manage Schedule Group',
  key: 'manage_schedule_group',
  description: `Create, update, or delete schedule groups for coordinated multi-channel publishing. Groups bundle multiple scheduled posts to publish across channels simultaneously.
Use **create** to make a new group (as draft or scheduled), **update** to modify an existing group, or **delete** to remove groups.`,
  instructions: [
    'To create a draft group, set status to "draft". Drafts are not published until changed to "scheduled".',
    'When updating, provide the existing scheduleGroupId in the group.',
    'Use "Schedule Post" for simple single-post scheduling without groups.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      teamId: z.string().optional().describe('Team ID (required for create and update)'),
      scheduleGroupIds: z
        .array(z.string())
        .optional()
        .describe('Group IDs to delete (required for delete action)'),
      scheduleGroupId: z
        .string()
        .optional()
        .describe('Existing group ID (required for update action)'),
      publishOn: z.string().optional().describe('ISO 8601 datetime for scheduled publishing'),
      status: z.enum(['draft', 'scheduled']).optional().describe('Group status'),
      schedules: z
        .array(scheduleEntryInput)
        .optional()
        .describe('Schedules in the group (required for create/update)'),
      validateOnly: z
        .boolean()
        .optional()
        .describe('Validate without creating (for create/update)')
    })
  )
  .output(
    z.object({
      groups: z
        .array(scheduleGroupResultSchema)
        .optional()
        .describe('Created or updated schedule groups'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'delete') {
      if (!ctx.input.scheduleGroupIds || ctx.input.scheduleGroupIds.length === 0) {
        throw new Error('scheduleGroupIds is required for delete action');
      }
      await client.deleteScheduleGroups(ctx.input.scheduleGroupIds);
      return {
        output: { success: true },
        message: `Deleted ${ctx.input.scheduleGroupIds.length} schedule group(s).`
      };
    }

    if (!ctx.input.teamId) {
      throw new Error('teamId is required for create/update actions');
    }
    if (!ctx.input.schedules || ctx.input.schedules.length === 0) {
      throw new Error('schedules is required for create/update actions');
    }

    let groupInput = {
      id: ctx.input.action === 'update' ? ctx.input.scheduleGroupId : undefined,
      publishOn: ctx.input.publishOn,
      status: ctx.input.status,
      schedules: ctx.input.schedules.map(s => ({
        channelId: s.channelId,
        content: s.content,
        media: s.media?.map(m => ({ id: m.mediaId, options: m.options || {} })),
        options: s.options
      }))
    };

    let result = await client.createScheduleGroups(
      ctx.input.teamId,
      [groupInput],
      ctx.input.validateOnly
    );

    let data = result.data || result;
    let groups = (Array.isArray(data) ? data : [data]).map((g: any) => ({
      scheduleGroupId: g.id,
      status: g.status,
      publishOn: g.publishOn || g.publish_on,
      scheduleCount: g.schedules?.length
    }));

    return {
      output: { groups, success: true },
      message: ctx.input.validateOnly
        ? 'Validation passed successfully.'
        : `Schedule group ${ctx.input.action === 'update' ? 'updated' : 'created'} with ${ctx.input.schedules.length} schedule(s).`
    };
  });
