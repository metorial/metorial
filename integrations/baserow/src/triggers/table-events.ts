import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let tableEvents = SlateTrigger.create(spec, {
  name: 'Table Events',
  key: 'table_events',
  description:
    "Triggers when rows are created, updated, or deleted in a Baserow table, or when views or fields change. Set up a webhook in Baserow (table settings > Webhooks) and point it to this trigger's URL.",
  instructions: [
    'In the Baserow UI, navigate to your table, click the three dots menu, and select "Webhooks" to configure a webhook pointing to this trigger\'s URL.',
    'Select the events you want to listen to: rows.created, rows.updated, rows.deleted, field.created, field.updated, field.deleted, view.created, view.updated, view.deleted.',
    'Use POST as the request method and enable "Use user field names" for human-readable field names in the payload.'
  ]
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'The event type (e.g. rows.created, rows.updated, rows.deleted, field.created, view.created)'
        ),
      eventId: z.string().describe('Unique identifier for this webhook event'),
      tableId: z.number().describe('The table ID the event occurred on'),
      databaseId: z.number().optional().describe('The database ID'),
      workspaceId: z.number().optional().describe('The workspace ID'),
      items: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Affected row/field/view data'),
      oldItems: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Previous state of rows (for update events)')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('The type of event that occurred'),
      tableId: z.number().describe('The table ID the event relates to'),
      databaseId: z.number().optional().describe('The database ID'),
      workspaceId: z.number().optional().describe('The workspace ID'),
      items: z
        .array(z.record(z.string(), z.any()))
        .describe('Affected data items (rows, fields, or views)'),
      oldItems: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Previous state of rows (only for rows.updated events)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.event_type || body.type || 'unknown';
      let eventId = body.event_id || `${eventType}-${Date.now()}`;
      let tableId = body.table_id || 0;
      let databaseId = body.database_id;
      let workspaceId = body.workspace_id;

      let items = body.items || [];
      let oldItems = body.old_items;

      return {
        inputs: [
          {
            eventType,
            eventId: String(eventId),
            tableId,
            databaseId,
            workspaceId,
            items,
            oldItems
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          eventType: ctx.input.eventType,
          tableId: ctx.input.tableId,
          databaseId: ctx.input.databaseId,
          workspaceId: ctx.input.workspaceId,
          items: ctx.input.items || [],
          oldItems: ctx.input.oldItems
        }
      };
    }
  })
  .build();
