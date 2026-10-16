import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { type ActivityData, Client, type PaginatedResponse } from '../lib/client';
import { spec } from '../spec';

export let getActivity = SlateTool.create(spec, {
  name: 'Get Activity',
  key: 'get_activity',
  description: `View activity logs scoped to a video, team, or user. Activity types include video additions/deletions, subtitle version changes, URL changes, team membership changes, and more. Provide exactly one of videoId, teamSlug, or userIdentifier to scope the query.`,
  instructions: [
    'Provide exactly one of videoId, teamSlug, or userIdentifier to determine the activity scope.',
    'Activity types include: video-added, comment-added, version-added, video-title-changed, video-url-added, video-url-edited, video-url-deleted, video-deleted, member-joined, member-left, version-approved, version-rejected, version-accepted, version-declined.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      videoId: z.string().optional().describe('Video ID to get activity for'),
      teamSlug: z.string().optional().describe('Team slug to get activity for'),
      userIdentifier: z
        .string()
        .optional()
        .describe('User identifier (username or "id$userId") to get activity for'),
      activityType: z.string().optional().describe('Filter by activity type'),
      languageCode: z.string().optional().describe('Filter by language code'),
      before: z
        .string()
        .optional()
        .describe('Only return activity before this date (ISO 8601)'),
      after: z.string().optional().describe('Only return activity after this date (ISO 8601)'),
      limit: z.number().optional().describe('Number of results per page'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of activity items'),
      activities: z.array(
        z.object({
          activityType: z.string().describe('Activity type'),
          date: z.string().describe('Activity date (ISO 8601)'),
          username: z.string().nullable().describe('User who performed the action'),
          userId: z
            .string()
            .optional()
            .describe('Stable ID of the user who performed the action'),
          videoId: z.string().nullable().describe('Related video ID'),
          languageCode: z.string().nullable().describe('Related language code')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    if (
      [ctx.input.videoId, ctx.input.teamSlug, ctx.input.userIdentifier].filter(
        value => value !== undefined
      ).length !== 1
    ) {
      throw createApiServiceError(
        'Provide exactly one of videoId, teamSlug, or userIdentifier.'
      );
    }
    let result: PaginatedResponse<ActivityData>;

    if (ctx.input.videoId) {
      result = await client.getVideoActivity(ctx.input.videoId, {
        type: ctx.input.activityType,
        language: ctx.input.languageCode,
        before: ctx.input.before,
        after: ctx.input.after,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
    } else if (ctx.input.teamSlug) {
      result = await client.getTeamActivity(ctx.input.teamSlug, {
        type: ctx.input.activityType,
        language: ctx.input.languageCode,
        before: ctx.input.before,
        after: ctx.input.after,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
    } else if (ctx.input.userIdentifier) {
      result = await client.getUserActivity(ctx.input.userIdentifier, {
        type: ctx.input.activityType,
        language: ctx.input.languageCode,
        before: ctx.input.before,
        after: ctx.input.after,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
    } else {
      throw createApiServiceError(
        'Provide exactly one of videoId, teamSlug, or userIdentifier'
      );
    }

    let activities = result.objects.map(a => ({
      activityType: a.type,
      date: a.date,
      username: a.user?.username ?? null,
      userId: a.user?.id,
      videoId: a.video ?? null,
      languageCode: a.language ?? null
    }));

    return {
      output: {
        totalCount: result.meta.total_count,
        activities
      },
      message: `Found **${result.meta.total_count}** activity item(s). Returned ${activities.length} results.`
    };
  })
  .build();
