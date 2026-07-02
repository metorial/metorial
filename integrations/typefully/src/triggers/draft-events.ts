import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let draftEventTypes = [
  'draft.created',
  'draft.published',
  'draft.scheduled',
  'draft.status_changed',
  'draft.tags_changed',
  'draft.deleted'
] as const;

export let draftEvents = SlateTrigger.create(spec, {
  name: 'Draft Events',
  key: 'draft_events',
  description:
    'Fires when a draft is created, published, scheduled, deleted, or when its status or tags change. Configure the webhook URL in Typefully Settings → API.'
})
  .input(
    z.object({
      eventType: z.enum(draftEventTypes).describe('Type of draft event'),
      timestamp: z.string().describe('Unix timestamp of the event'),
      draftId: z.string().describe('ID of the affected draft'),
      socialSetId: z.string().describe('ID of the social set'),
      status: z.string().nullable().describe('Draft status after the event'),
      createdAt: z.string().nullable().describe('When the draft was created'),
      updatedAt: z.string().nullable().describe('When the draft was last updated'),
      scheduledDate: z.string().nullable().describe('Scheduled publication time'),
      publishedAt: z.string().nullable().describe('When the draft was published'),
      draftTitle: z.string().nullable().describe('Internal title of the draft'),
      tags: z.array(z.string()).describe('Tags on the draft'),
      preview: z.string().nullable().describe('Preview text of the draft'),
      enabledPlatforms: z.array(z.string()).describe('Platforms this draft targets'),
      publishedUrls: z
        .record(z.string(), z.string().nullable())
        .describe('Published post URLs per platform')
    })
  )
  .output(
    z.object({
      draftId: z.string().describe('ID of the affected draft'),
      socialSetId: z.string().describe('ID of the social set'),
      status: z.string().nullable().describe('Draft status after the event'),
      createdAt: z.string().nullable().describe('When the draft was created'),
      updatedAt: z.string().nullable().describe('When the draft was last updated'),
      scheduledDate: z.string().nullable().describe('Scheduled publication time'),
      publishedAt: z.string().nullable().describe('When the draft was published'),
      draftTitle: z.string().nullable().describe('Internal title of the draft'),
      tags: z.array(z.string()).describe('Tags on the draft'),
      preview: z.string().nullable().describe('Preview text of the draft'),
      enabledPlatforms: z.array(z.string()).describe('Platforms targeted by the draft'),
      publishedUrls: z
        .record(z.string(), z.string().nullable())
        .describe('Published post URLs per platform')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let eventType = ctx.request.headers.get('x-typefully-event') as string | null;
      let timestamp = ctx.request.headers.get('x-typefully-timestamp') ?? '';

      let body = (await ctx.request.json()) as any;

      if (!eventType || !body) {
        return { inputs: [] };
      }

      let draft = body.data ?? body;

      let enabledPlatforms: string[] = [];
      if (draft.x_post_enabled) enabledPlatforms.push('x');
      if (draft.linkedin_post_enabled) enabledPlatforms.push('linkedin');
      if (draft.threads_post_enabled) enabledPlatforms.push('threads');
      if (draft.bluesky_post_enabled) enabledPlatforms.push('bluesky');
      if (draft.mastodon_post_enabled) enabledPlatforms.push('mastodon');

      let publishedUrls: Record<string, string | null> = {};
      if (draft.x_published_url) publishedUrls.x = draft.x_published_url;
      if (draft.linkedin_published_url) publishedUrls.linkedin = draft.linkedin_published_url;
      if (draft.threads_published_url) publishedUrls.threads = draft.threads_published_url;
      if (draft.bluesky_published_url) publishedUrls.bluesky = draft.bluesky_published_url;
      if (draft.mastodon_published_url) publishedUrls.mastodon = draft.mastodon_published_url;

      return {
        inputs: [
          {
            eventType: eventType as any,
            timestamp,
            draftId: draft.id ?? '',
            socialSetId: draft.social_set_id ?? '',
            status: draft.status ?? null,
            createdAt: draft.created_at ?? null,
            updatedAt: draft.updated_at ?? null,
            scheduledDate: draft.scheduled_date ?? null,
            publishedAt: draft.published_at ?? null,
            draftTitle: draft.draft_title ?? null,
            tags: draft.tags ?? [],
            preview: draft.preview ?? null,
            enabledPlatforms,
            publishedUrls
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: `${ctx.input.draftId}-${ctx.input.eventType}-${ctx.input.timestamp}`,
        output: {
          draftId: ctx.input.draftId,
          socialSetId: ctx.input.socialSetId,
          status: ctx.input.status,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt,
          scheduledDate: ctx.input.scheduledDate,
          publishedAt: ctx.input.publishedAt,
          draftTitle: ctx.input.draftTitle,
          tags: ctx.input.tags,
          preview: ctx.input.preview,
          enabledPlatforms: ctx.input.enabledPlatforms,
          publishedUrls: ctx.input.publishedUrls
        }
      };
    }
  })
  .build();
