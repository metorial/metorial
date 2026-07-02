import { SlateTool } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let manageDiscussionTool = SlateTool.create(spec, {
  name: 'Manage Discussion',
  key: 'manage_discussion',
  description: `Create, update, or delete a discussion topic in a course. Supports threaded discussions, graded discussions, and announcements. Configure pinning, locking, and publish state.`,
  instructions: [
    'Set isAnnouncement to true to create an announcement instead of a discussion.',
    'To create a graded discussion, provide an assignmentId or set assignmentGroupId.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      courseId: z.string().describe('The Canvas course ID'),
      topicId: z
        .string()
        .optional()
        .describe('Discussion topic ID (required for update/delete)'),
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      title: z.string().optional().describe('Discussion topic title'),
      message: z.string().optional().describe('Discussion body (HTML)'),
      discussionType: z
        .enum(['side_comment', 'threaded'])
        .optional()
        .describe('Discussion threading type'),
      published: z.boolean().optional().describe('Whether the discussion is published'),
      pinned: z.boolean().optional().describe('Whether to pin the discussion'),
      locked: z.boolean().optional().describe('Whether to lock the discussion'),
      isAnnouncement: z.boolean().optional().describe('Create as an announcement'),
      delayedPostAt: z
        .string()
        .optional()
        .nullable()
        .describe('Scheduled post date (ISO 8601)'),
      requireInitialPost: z
        .boolean()
        .optional()
        .describe('Require students to post before seeing replies'),
      allowRating: z.boolean().optional().describe('Allow users to rate entries')
    })
  )
  .output(
    z.object({
      topicId: z.string().describe('Discussion topic ID'),
      title: z.string().optional().describe('Topic title'),
      discussionType: z.string().optional().describe('Threading type'),
      posted: z.boolean().optional().describe('Whether posted/published'),
      pinned: z.boolean().optional().describe('Whether pinned'),
      locked: z.boolean().optional().describe('Whether locked'),
      isAnnouncement: z.boolean().optional().describe('Whether this is an announcement')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CanvasClient({
      token: ctx.auth.token,
      canvasDomain: ctx.auth.canvasDomain
    });

    let topicData: Record<string, any> = {};
    if (ctx.input.title) topicData.title = ctx.input.title;
    if (ctx.input.message) topicData.message = ctx.input.message;
    if (ctx.input.discussionType) topicData.discussion_type = ctx.input.discussionType;
    if (ctx.input.published !== undefined) topicData.published = ctx.input.published;
    if (ctx.input.pinned !== undefined) topicData.pinned = ctx.input.pinned;
    if (ctx.input.locked !== undefined) topicData.locked = ctx.input.locked;
    if (ctx.input.isAnnouncement !== undefined)
      topicData.is_announcement = ctx.input.isAnnouncement;
    if (ctx.input.delayedPostAt !== undefined)
      topicData.delayed_post_at = ctx.input.delayedPostAt;
    if (ctx.input.requireInitialPost !== undefined)
      topicData.require_initial_post = ctx.input.requireInitialPost;
    if (ctx.input.allowRating !== undefined) topicData.allow_rating = ctx.input.allowRating;

    let result: any;
    let actionDesc: string;

    if (ctx.input.action === 'create') {
      result = await client.createDiscussionTopic(ctx.input.courseId, topicData);
      actionDesc = 'Created';
    } else if (ctx.input.action === 'update') {
      if (!ctx.input.topicId) throw new Error('topicId is required for update');
      result = await client.updateDiscussionTopic(
        ctx.input.courseId,
        ctx.input.topicId,
        topicData
      );
      actionDesc = 'Updated';
    } else {
      if (!ctx.input.topicId) throw new Error('topicId is required for delete');
      result = await client.deleteDiscussionTopic(ctx.input.courseId, ctx.input.topicId);
      actionDesc = 'Deleted';
    }

    return {
      output: {
        topicId: String(result.id),
        title: result.title,
        discussionType: result.discussion_type,
        posted: result.posted,
        pinned: result.pinned,
        locked: result.locked,
        isAnnouncement: result.is_announcement
      },
      message: `${actionDesc} discussion **${result.title}** (ID: ${result.id}).`
    };
  })
  .build();
