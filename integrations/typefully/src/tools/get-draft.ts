import { SlateTool } from 'slates';
import { z } from 'zod';
import { TypefullyClient } from '../lib/client';
import { spec } from '../spec';

let platformPostOutputSchema = z.object({
  text: z.string().describe('Text content of the post'),
  mediaIds: z.array(z.string()).optional().describe('Attached media IDs')
});

let platformOutputSchema = z.object({
  enabled: z.boolean().describe('Whether this platform is enabled'),
  posts: z.array(platformPostOutputSchema).describe('Posts in the thread')
});

export let getDraft = SlateTool.create(spec, {
  name: 'Get Draft',
  key: 'get_draft',
  description: `Retrieve full details of a specific draft, including its platform-specific content, status, scheduling info, and published URLs. Useful for inspecting draft content before publishing or checking published post URLs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      socialSetId: z.string().describe('ID of the social set'),
      draftId: z.string().describe('ID of the draft to retrieve')
    })
  )
  .output(
    z.object({
      draftId: z.string().describe('ID of the draft'),
      socialSetId: z.string().describe('ID of the social set'),
      status: z.string().describe('Draft status'),
      createdAt: z.string().describe('When the draft was created'),
      updatedAt: z.string().describe('When the draft was last updated'),
      scheduledDate: z.string().nullable().describe('Scheduled publication time'),
      publishedAt: z.string().nullable().describe('When the draft was published'),
      draftTitle: z.string().nullable().describe('Internal title'),
      tags: z.array(z.string()).describe('Tags assigned'),
      preview: z.string().nullable().describe('Preview text'),
      shareUrl: z.string().nullable().describe('Public share URL'),
      privateUrl: z.string().nullable().describe('Private draft URL'),
      platforms: z
        .object({
          x: platformOutputSchema.optional().describe('X (Twitter) content'),
          linkedin: platformOutputSchema.optional().describe('LinkedIn content'),
          threads: platformOutputSchema.optional().describe('Threads content'),
          bluesky: platformOutputSchema.optional().describe('Bluesky content'),
          mastodon: platformOutputSchema.optional().describe('Mastodon content')
        })
        .describe('Platform-specific content'),
      publishedUrls: z
        .object({
          x: z.string().nullable().optional().describe('Published X post URL'),
          linkedin: z.string().nullable().optional().describe('Published LinkedIn post URL'),
          threads: z.string().nullable().optional().describe('Published Threads post URL'),
          bluesky: z.string().nullable().optional().describe('Published Bluesky post URL'),
          mastodon: z.string().nullable().optional().describe('Published Mastodon post URL')
        })
        .describe('URLs of published posts per platform')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TypefullyClient(ctx.auth.token);

    let draft = await client.getDraft(ctx.input.socialSetId, ctx.input.draftId);

    let mapPlatform = (config: any) => {
      if (!config) return undefined;
      return {
        enabled: config.enabled,
        posts: (config.posts ?? []).map((post: any) => ({
          text: post.text,
          ...(post.media_ids?.length ? { mediaIds: post.media_ids } : {})
        }))
      };
    };

    return {
      output: {
        draftId: draft.id,
        socialSetId: draft.social_set_id,
        status: draft.status,
        createdAt: draft.created_at,
        updatedAt: draft.updated_at,
        scheduledDate: draft.scheduled_date,
        publishedAt: draft.published_at,
        draftTitle: draft.draft_title,
        tags: draft.tags ?? [],
        preview: draft.preview,
        shareUrl: draft.share_url,
        privateUrl: draft.private_url,
        platforms: {
          x: mapPlatform(draft.platforms?.x),
          linkedin: mapPlatform(draft.platforms?.linkedin),
          threads: mapPlatform(draft.platforms?.threads),
          bluesky: mapPlatform(draft.platforms?.bluesky),
          mastodon: mapPlatform(draft.platforms?.mastodon)
        },
        publishedUrls: {
          x: draft.x_published_url,
          linkedin: draft.linkedin_published_url,
          threads: draft.threads_published_url,
          bluesky: draft.bluesky_published_url,
          mastodon: draft.mastodon_published_url
        }
      },
      message: `Draft \`${draft.id}\` — status: **${draft.status}**${draft.preview ? `, preview: "${draft.preview.substring(0, 100)}..."` : ''}`
    };
  })
  .build();
