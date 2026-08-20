import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { NotionClient } from '../lib/client';
import {
  captureNotionWebhookBootstrap,
  handleNotionWebhookRequest,
  notionWebhookHttp,
  verifyNotionWebhook
} from '../lib/webhook';
import { spec } from '../spec';

export let databaseEvents = SlateTrigger.create(spec, {
  name: 'Database Events',
  key: 'database_events',
  description:
    'Receives webhook notifications when a database schema changes (properties added, renamed, or deleted). Configure the webhook URL in your Notion integration settings; the one-time verification_token is captured automatically and verifies X-Notion-Signature on later deliveries.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of database event'),
      eventId: z.string().describe('Unique event identifier'),
      databaseId: z.string().describe('ID of the affected database'),
      timestamp: z.string().describe('When the event occurred'),
      rawEvent: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      databaseId: z.string().describe('ID of the affected database'),
      title: z.string().optional().describe('Title of the database'),
      url: z.string().optional().describe('URL of the database'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Current database schema properties'),
      lastEditedTime: z.string().optional().describe('When the database was last edited')
    })
  )
  .webhook({
    http: notionWebhookHttp,
    verifyWebhook: verifyNotionWebhook,
    captureWebhookBootstrap: captureNotionWebhookBootstrap,
    handleRequest: async ctx => {
      let parsed = await handleNotionWebhookRequest(ctx);
      if (parsed.type === 'complete') return parsed.result;

      let dbEvents = parsed.events.filter((e: any) => {
        let type = e.type ?? '';
        return type.startsWith('database.') || type.startsWith('data_source.');
      });

      let inputs = dbEvents.map((event: any) => ({
        eventType: event.type,
        eventId:
          event.id ??
          `${event.type}-${event.entity?.id ?? 'unknown'}-${event.timestamp ?? Date.now()}`,
        databaseId: event.entity?.id ?? event.database_id ?? '',
        timestamp: event.timestamp ?? new Date().toISOString(),
        rawEvent: event
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let client = new NotionClient({ token: ctx.auth.token });

      let db: any = null;
      try {
        db = await client.getDatabase(ctx.input.databaseId);
      } catch {
        // Database may have been deleted or access revoked
      }

      let title: string | undefined;
      if (Array.isArray(db?.title)) {
        title = db.title.map((t: any) => t.plain_text ?? '').join('');
      }

      let mappedType = 'database.schema_updated';
      if (ctx.input.eventType === 'data_source.schema_updated') {
        mappedType = 'database.schema_updated';
      }

      return {
        type: mappedType,
        id: ctx.input.eventId,
        output: {
          databaseId: ctx.input.databaseId,
          title,
          url: db?.url,
          properties: db?.properties,
          lastEditedTime: db?.last_edited_time
        }
      };
    }
  })
  .build();
