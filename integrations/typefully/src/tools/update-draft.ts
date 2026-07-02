import { SlateTool } from 'slates';
import { z } from 'zod';
import { TypefullyClient } from '../lib/client';
import { spec } from '../spec';

let platformPostSchema = z.object({
  text: z.string().describe('Text content of the post'),
  mediaIds: z.array(z.string()).optional().describe('Media IDs to attach'),
  quotePostUrl: z.string().optional().describe('URL of a post to quote (X only)')
});

let platformConfigSchema = z.object({
  enabled: z.boolean().default(true).describe('Whether this platform is enabled'),
  posts: z.array(platformPostSchema).min(1).describe('Array of posts')
});

export let updateDraft = SlateTool.create(spec, {
  name: 'Update Draft',
  key: 'update_draft',
  description: `Update an existing draft's content, platform configuration, tags, scheduling, or title. Can also be used to schedule, reschedule, or publish an existing draft by setting the publishAt field.`,
  instructions: [
    'Only include fields you want to change — omitted fields remain unchanged.',
    'Set publishAt to "now" to publish, "next-free-slot" to queue, or an ISO 8601 datetime to schedule.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      socialSetId: z.string().describe('ID of the social set'),
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
      tags: z.array(z.string()).optional().describe('Updated tag names'),
      share: z.boolean().optional().describe('Whether to enable the share URL'),
      draftTitle: z.string().optional().describe('Updated internal title')
    })
  )
  .output(
    z.object({
      draftId: z.string().describe('ID of the updated draft'),
      status: z.string().describe('Updated draft status'),
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
      tags: ctx.input.tags,
      share: ctx.input.share,
      draftTitle: ctx.input.draftTitle
    });

    let enabledPlatforms: string[] = [];
    if (draft.x_post_enabled) enabledPlatforms.push('x');
    if (draft.linkedin_post_enabled) enabledPlatforms.push('linkedin');
    if (draft.threads_post_enabled) enabledPlatforms.push('threads');
    if (draft.bluesky_post_enabled) enabledPlatforms.push('bluesky');
    if (draft.mastodon_post_enabled) enabledPlatforms.push('mastodon');

    return {
      output: {
        draftId: draft.id,
        status: draft.status,
        updatedAt: draft.updated_at,
        scheduledDate: draft.scheduled_date,
        publishedAt: draft.published_at,
        draftTitle: draft.draft_title,
        tags: draft.tags ?? [],
        preview: draft.preview,
        enabledPlatforms
      },
      message: `Draft \`${draft.id}\` updated — status: **${draft.status}**`
    };
  })
  .build();
