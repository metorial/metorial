import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let commentEvents = SlateTrigger.create(spec, {
  name: 'Comment Events',
  key: 'comment_events',
  description:
    'Receives webhook notifications when new comments are added to pages or blocks the integration has access to. Configure the webhook URL in your Notion integration settings.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of comment event'),
      eventId: z.string().describe('Unique event identifier'),
      commentId: z.string().describe('ID of the comment'),
      pageId: z.string().optional().describe('ID of the page the comment belongs to'),
      timestamp: z.string().describe('When the event occurred'),
      rawEvent: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('ID of the comment'),
      pageId: z.string().optional().describe('ID of the parent page'),
      discussionId: z.string().optional().describe('ID of the discussion thread'),
      richText: z.array(z.any()).optional().describe('Rich text content of the comment'),
      plainText: z.string().optional().describe('Plain text content of the comment'),
      createdTime: z.string().optional().describe('When the comment was created'),
      createdBy: z.any().optional().describe('User who created the comment')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      // Handle Notion webhook verification challenge
      if (body.type === 'url_verification' || body.challenge) {
        return {
          inputs: [],
          response: new Response(JSON.stringify({ challenge: body.challenge }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        };
      }

      let events: any[] = [];

      if (body.type && body.entity) {
        events.push(body);
      } else if (Array.isArray(body.events)) {
        events = body.events;
      } else if (body.event) {
        events.push(body.event);
      }

      let commentEvents = events.filter((e: any) => {
        let type = e.type ?? '';
        return type.startsWith('comment.');
      });

      let inputs = commentEvents.map((event: any) => ({
        eventType: event.type,
        eventId:
          event.id ??
          `${event.type}-${event.entity?.id ?? 'unknown'}-${event.timestamp ?? Date.now()}`,
        commentId: event.entity?.id ?? '',
        pageId: event.entity?.parent?.page_id ?? event.page_id,
        timestamp: event.timestamp ?? new Date().toISOString(),
        rawEvent: event
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      // Notion webhooks use sparse payloads, so we need to fetch the full comment data
      // However, there's no direct "get comment by ID" endpoint that's widely available
      // We return what we can from the webhook payload

      return {
        type: 'comment.created',
        id: ctx.input.eventId,
        output: {
          commentId: ctx.input.commentId,
          pageId: ctx.input.pageId,
          discussionId: ctx.input.rawEvent?.entity?.discussion_id,
          richText: ctx.input.rawEvent?.entity?.rich_text,
          plainText: Array.isArray(ctx.input.rawEvent?.entity?.rich_text)
            ? ctx.input.rawEvent.entity.rich_text.map((t: any) => t.plain_text ?? '').join('')
            : undefined,
          createdTime: ctx.input.timestamp,
          createdBy: ctx.input.rawEvent?.entity?.created_by
        }
      };
    }
  })
  .build();
