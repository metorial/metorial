import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageHistoricEvents = SlateTool.create(spec, {
  name: 'Manage Milestones',
  key: 'manage_milestones',
  description: `Add, update, or remove milestones and life events (birthdays, anniversaries, etc.) for a person in CentralStationCRM. These events support personalized outreach and relationship building.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'update', 'remove', 'list']).describe('Action to perform'),
      personId: z.number().describe('ID of the person'),
      eventId: z
        .number()
        .optional()
        .describe('ID of the historic event (required for update and remove)'),
      eventName: z
        .string()
        .optional()
        .describe('Name/title of the event (e.g., "Birthday", "Work Anniversary")'),
      eventDate: z.string().optional().describe('Date of the event (YYYY-MM-DD)'),
      category: z.string().optional().describe('Category of the event')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      eventId: z.number().optional().describe('ID of the historic event'),
      events: z
        .array(z.any())
        .optional()
        .describe('List of historic events (when action is "list")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    if (ctx.input.action === 'list') {
      let result = await client.listPersonHistoricEvents(ctx.input.personId);
      let items = Array.isArray(result) ? result : [];

      return {
        output: {
          success: true,
          events: items
        },
        message: `Found **${items.length}** milestones for person (ID: ${ctx.input.personId}).`
      };
    }

    if (ctx.input.action === 'add') {
      let result = await client.createPersonHistoricEvent(ctx.input.personId, {
        name: ctx.input.eventName,
        date: ctx.input.eventDate,
        category: ctx.input.category
      });
      let event = result?.historic_event ?? result;

      return {
        output: {
          success: true,
          eventId: event?.id
        },
        message: `Added milestone **${ctx.input.eventName}** to person (ID: ${ctx.input.personId}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.eventId) throw new Error('eventId is required when updating a milestone');

      let data: Record<string, unknown> = {};
      if (ctx.input.eventName !== undefined) data.name = ctx.input.eventName;
      if (ctx.input.eventDate !== undefined) data.date = ctx.input.eventDate;
      if (ctx.input.category !== undefined) data.category = ctx.input.category;

      let result = await client.updatePersonHistoricEvent(
        ctx.input.personId,
        ctx.input.eventId,
        data
      );
      let event = result?.historic_event ?? result;

      return {
        output: {
          success: true,
          eventId: event?.id
        },
        message: `Updated milestone (ID: ${ctx.input.eventId}) for person (ID: ${ctx.input.personId}).`
      };
    }

    // remove
    if (!ctx.input.eventId) throw new Error('eventId is required when removing a milestone');
    await client.deletePersonHistoricEvent(ctx.input.personId, ctx.input.eventId);

    return {
      output: {
        success: true,
        eventId: ctx.input.eventId
      },
      message: `Removed milestone (ID: ${ctx.input.eventId}) from person (ID: ${ctx.input.personId}).`
    };
  })
  .build();
