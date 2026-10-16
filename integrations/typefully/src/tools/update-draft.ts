import { SlateTool } from 'slates';
import { z } from 'zod';
import { enabledDraftPlatforms, providerId, TypefullyClient } from '../lib/client';
import { spec } from '../spec';

let platformPostSchema = z.object({
  text: z.string().describe('Text content of the post'),
  mediaIds: z.array(z.string()).optional().describe('Media IDs to attach'),
  quotePostUrl: z.string().optional().describe('URL of a post to quote (X only)')
});

let platformConfigSchema = z.object({
  enabled: z.boolean().default(true).describe('Whether this platform is enabled'),
  settings: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Platform-specific settings, such as X reply_to_url.'),
  posts: z.array(platformPostSchema).min(1).describe('Array of posts')
});

export let updateDraft = SlateTool.create(spec, {
  name: 'Update Draft',
  key: 'update_draft',
  description: `Update an existing draft's content, platform configuration, tags, scheduling, or title. Can also be used to schedule, reschedule, or publish an existing draft by setting the publishAt field.`,
  instructions: [
    'Only include fields you want to change — omitted fields remain unchanged.',
    'Call get_draft first and preserve all comment-thread markers exactly when editing text.',
    'Set publishAt to "now" to publish, "next-free-slot" to queue, or an ISO 8601 datetime to schedule.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      socialSetId: z
        .string()
        .describe('Social set ID. Call list_social_sets to discover accessible social sets.'),
      draftId: z.string().describe('ID of the draft to update'),
      platforms: z
        .object({
          x: platformConfigSchema.optional().describe('X (Twitter) content'),
          linkedin: platformConfigSchema.optional().describe('LinkedIn content'),
          threads: platformConfigSchema.optional().describe('Threads content'),
          bluesky: platformConfigSchema.optional().describe('Bluesky content'),
          mastodon: platformConfigSchema.optional().describe('Mastodon content')
        })
        .optional()
        .describe('Updated platform content'),
      publishAt: z
        .string()
        .optional()
        .describe('When to publish: "now", "next-free-slot", or ISO 8601 datetime'),
      planAt: z
        .string()
        .nullable()
        .optional()
        .describe(
          'Plan for an ISO datetime or next-free-slot without auto-publishing; null clears the date. Mutually exclusive with publishAt.'
        ),
      tags: z
        .array(z.string())
        .optional()
        .describe('Updated tag slugs; use manage_tags to discover them'),
      share: z.boolean().optional().describe('Whether to enable the share URL'),
      draftTitle: z.string().optional().describe('Updated internal title'),
      forceOverwriteComments: z
        .boolean()
        .optional()
        .describe(
          'Explicitly resolve comment threads whose anchor markers are omitted from updated text. Omit to preserve the default marker validation.'
        )
    })
  )
  .output(
    z.object({
      draftId: z.string().describe('ID of the updated draft'),
      status: z.string().describe('Updated draft status'),
      publishState: z
        .string()
        .nullable()
        .optional()
        .describe(
          'Publishing progress; in_progress means accepted asynchronously. Poll get_draft until finished.'
        ),
      updatedAt: z.string().describe('When the draft was last updated'),
      scheduledDate: z.string().nullable().describe('Scheduled publication time'),
      publishedAt: z.string().nullable().describe('When published, if applicable'),
      draftTitle: z.string().nullable().describe('Internal title'),
      tags: z.array(z.string()).describe('Current tags'),
      preview: z.string().nullable().describe('Preview text'),
      enabledPlatforms: z.array(z.string()).describe('Platforms this draft targets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TypefullyClient(ctx.auth.token);

    let platformsPayload: Record<string, unknown> | undefined;
    if (ctx.input.platforms) {
      platformsPayload = {};
      for (let [platform, config] of Object.entries(ctx.input.platforms)) {
        if (config) {
          platformsPayload[platform] = {
            enabled: config.enabled,
            ...(config.settings !== undefined ? { settings: config.settings } : {}),
            posts: config.posts.map(post => ({
              text: post.text,
              ...(post.mediaIds ? { media_ids: post.mediaIds } : {}),
              ...(post.quotePostUrl ? { quote_post_url: post.quotePostUrl } : {})
            }))
          };
        }
      }
    }

    let draft = await client.updateDraft(ctx.input.socialSetId, ctx.input.draftId, {
      platforms: platformsPayload as any,
      publishAt: ctx.input.publishAt,
      planAt: ctx.input.planAt,
      tags: ctx.input.tags,
      share: ctx.input.share,
      draftTitle: ctx.input.draftTitle,
      forceOverwriteComments: ctx.input.forceOverwriteComments
    });

    let enabledPlatforms = enabledDraftPlatforms(draft);

    return {
      output: {
        draftId: providerId(draft.id),
        status: draft.status,
        publishState: draft.publish_state,
        updatedAt: draft.updated_at,
        scheduledDate: draft.scheduled_date,
        publishedAt: draft.published_at,
        draftTitle: draft.draft_title,
        tags: draft.tags,
        preview: draft.preview,
        enabledPlatforms
      },
      message: `Draft \`${draft.id}\` updated — status: **${draft.status}**`
    };
  })
  .build();
