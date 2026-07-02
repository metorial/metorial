import { SlateTool } from 'slates';
import { z } from 'zod';
import { TypefullyClient } from '../lib/client';
import { spec } from '../spec';

let platformPostSchema = z.object({
  text: z.string().describe('Text content of the post'),
  mediaIds: z
    .array(z.string())
    .optional()
    .describe('Media IDs to attach (from upload-media tool)'),
  quotePostUrl: z.string().optional().describe('URL of a post to quote (X only)')
});

let platformConfigSchema = z.object({
  enabled: z.boolean().default(true).describe('Whether this platform is enabled'),
  posts: z
    .array(platformPostSchema)
    .min(1)
    .describe('Array of posts (multiple posts create a thread)')
});

export let createDraft = SlateTool.create(spec, {
  name: 'Create Draft',
  key: 'create_draft',
  description: `Create a new draft post for one or more social media platforms (X, LinkedIn, Threads, Bluesky, Mastodon). Each platform can have its own tailored content and thread structure. Drafts can be saved, scheduled for a specific time, queued to the next available slot, or published immediately.`,
  instructions: [
    'Set publishAt to "now" to publish immediately, "next-free-slot" to queue, or an ISO 8601 datetime to schedule.',
    'Omit publishAt to save as a draft without scheduling.',
    'Each platform has its own posts array — provide platform-specific content for best results.',
    'Use the upload-media tool first to get media IDs for attaching images, videos, or files.'
  ],
  constraints: [
    'Requires a socialSetId — use the list-social-sets tool to find available social sets.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      socialSetId: z.string().describe('ID of the social set to create the draft in'),
      platforms: z
        .object({
          x: platformConfigSchema.optional().describe('X (Twitter) platform content'),
          linkedin: platformConfigSchema.optional().describe('LinkedIn platform content'),
          threads: platformConfigSchema.optional().describe('Threads platform content'),
          bluesky: platformConfigSchema.optional().describe('Bluesky platform content'),
          mastodon: platformConfigSchema.optional().describe('Mastodon platform content')
        })
        .describe('Platform-specific content configuration'),
      publishAt: z
        .string()
        .optional()
        .describe(
          'When to publish: "now", "next-free-slot", or ISO 8601 datetime. Omit to save as draft.'
        ),
      tags: z.array(z.string()).optional().describe('Tag names to assign to the draft'),
      share: z.boolean().optional().describe('Whether to generate a Typefully share URL'),
      draftTitle: z.string().optional().describe('Internal title for organizing the draft')
    })
  )
  .output(
    z.object({
      draftId: z.string().describe('ID of the created draft'),
      socialSetId: z.string().describe('ID of the social set'),
      status: z.string().describe('Draft status (draft, scheduled, published, publishing)'),
      createdAt: z.string().describe('When the draft was created'),
      scheduledDate: z.string().nullable().describe('Scheduled publication time, if set'),
      publishedAt: z
        .string()
        .nullable()
        .describe('When the draft was published, if applicable'),
      draftTitle: z.string().nullable().describe('Internal title of the draft'),
      tags: z.array(z.string()).describe('Tags assigned to the draft'),
      preview: z.string().nullable().describe('Preview text of the draft content'),
      shareUrl: z.string().nullable().describe('Public share URL, if sharing is enabled'),
      enabledPlatforms: z.array(z.string()).describe('List of platforms this draft targets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TypefullyClient(ctx.auth.token);

    let platformsPayload: Record<string, unknown> = {};
    let enabledPlatforms: string[] = [];

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
        if (config.enabled) {
          enabledPlatforms.push(platform);
        }
      }
    }

    let draft = await client.createDraft(ctx.input.socialSetId, {
      platforms: platformsPayload as any,
      publishAt: ctx.input.publishAt,
      tags: ctx.input.tags,
      share: ctx.input.share,
      draftTitle: ctx.input.draftTitle
    });

    let output = {
      draftId: draft.id,
      socialSetId: draft.social_set_id,
      status: draft.status,
      createdAt: draft.created_at,
      scheduledDate: draft.scheduled_date,
      publishedAt: draft.published_at,
      draftTitle: draft.draft_title,
      tags: draft.tags ?? [],
      preview: draft.preview,
      shareUrl: draft.share_url,
      enabledPlatforms
    };

    let statusMsg =
      draft.status === 'published'
        ? 'published immediately'
        : draft.status === 'scheduled'
          ? `scheduled for ${draft.scheduled_date}`
          : 'saved as draft';

    return {
      output,
      message: `Draft **${statusMsg}** targeting **${enabledPlatforms.join(', ')}**. Draft ID: \`${draft.id}\``
    };
  })
  .build();
