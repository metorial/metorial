import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { NotionClient } from '../lib/client';
import { spec } from '../spec';

export let pageEvents = SlateTrigger.create(spec, {
  name: 'Page Events',
  key: 'page_events',
  description:
    'Receives webhook notifications for page events including content updates, page creation, and lock/unlock changes. Configure the webhook URL in your Notion integration settings.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of page event'),
      eventId: z.string().describe('Unique event identifier'),
      pageId: z.string().describe('ID of the affected page'),
      timestamp: z.string().describe('When the event occurred'),
      rawEvent: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('ID of the affected page'),
      url: z.string().optional().describe('URL of the page'),
      title: z.string().optional().describe('Title of the page'),
      lastEditedTime: z.string().optional().describe('When the page was last edited'),
      createdTime: z.string().optional().describe('When the page was created'),
      archived: z.boolean().optional().describe('Whether the page is archived'),
      isLocked: z.boolean().optional().describe('Whether the page is locked'),
      properties: z.record(z.string(), z.any()).optional().describe('Page properties'),
      parent: z.any().optional().describe('Parent reference')
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

      // Process page events from the webhook payload
      let events: any[] = [];

      if (body.type && body.entity) {
        // Single event format
        events.push(body);
      } else if (Array.isArray(body.events)) {
        events = body.events;
      } else if (body.event) {
        events.push(body.event);
      }

      let pageEvents = events.filter((e: any) => {
        let type = e.type ?? '';
        return type.startsWith('page.');
      });

      let inputs = pageEvents.map((event: any) => ({
        eventType: event.type,
        eventId:
          event.id ??
          `${event.type}-${event.entity?.id ?? 'unknown'}-${event.timestamp ?? Date.now()}`,
        pageId: event.entity?.id ?? event.page_id ?? '',
        timestamp: event.timestamp ?? new Date().toISOString(),
        rawEvent: event
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let client = new NotionClient({ token: ctx.auth.token });

      let page: any = null;
      try {
        page = await client.getPage(ctx.input.pageId);
      } catch {
        // Page may have been deleted or access may have been revoked
      }

      let title: string | undefined;
      if (page?.properties) {
        for (let key of Object.keys(page.properties)) {
          let prop = page.properties[key];
          if (prop?.type === 'title' && Array.isArray(prop.title)) {
            title = prop.title.map((t: any) => t.plain_text ?? '').join('');
            break;
          }
        }
      }

      // Map event type to standardized format
      let eventType = ctx.input.eventType;
      let mappedType = 'page.updated';
      if (eventType === 'page.created') mappedType = 'page.created';
      else if (eventType === 'page.locked') mappedType = 'page.locked';
      else if (eventType === 'page.unlocked') mappedType = 'page.unlocked';
      else if (eventType === 'page.content_updated') mappedType = 'page.content_updated';

      return {
        type: mappedType,
        id: ctx.input.eventId,
        output: {
          pageId: ctx.input.pageId,
          url: page?.url,
          title,
          lastEditedTime: page?.last_edited_time,
          createdTime: page?.created_time,
          archived: page?.archived,
          isLocked: page?.is_locked,
          properties: page?.properties,
          parent: page?.parent
        }
      };
    }
  })
  .build();
