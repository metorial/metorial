import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleCalendarClient } from '../lib/client';
import { googleCalendarActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageCalendar = SlateTool.create(spec, {
  name: 'Manage Calendar',
  key: 'manage_calendar',
  description: `Create, update, or delete a secondary calendar. Can also subscribe to, update the display settings of, or unsubscribe from calendars on the user's calendar list.
Use the **action** field to select the operation.`,
  instructions: [
    'The "create" action creates a new secondary calendar.',
    'The "update" action modifies calendar properties (summary, description, location, timeZone).',
    'The "delete" action permanently deletes a secondary calendar and all its events. You cannot delete the primary calendar.',
    'The "subscribe" action adds an existing calendar to the user\'s calendar list.',
    'The "update_subscription" action changes color, visibility, selection, or display name for an already-subscribed calendar.',
    'The "unsubscribe" action removes a calendar from the user\'s calendar list without deleting it.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleCalendarActionScopes.manageCalendar)
  .input(
    z.object({
      action: z
        .enum([
          'create',
          'update',
          'delete',
          'subscribe',
          'update_subscription',
          'unsubscribe'
        ])
        .describe('Operation to perform'),
      calendarId: z
        .string()
        .optional()
        .describe(
          'Calendar ID (required for update, delete, subscribe, update_subscription, unsubscribe)'
        ),
      summary: z.string().optional().describe('Calendar title (used for create and update)'),
      description: z
        .string()
        .optional()
        .describe('Calendar description (used for create and update)'),
      location: z
        .string()
        .optional()
        .describe('Calendar location (used for create and update)'),
      timeZone: z.string().optional().describe('IANA time zone (used for create and update)'),
      colorId: z
        .string()
        .optional()
        .describe(
          'Color ID for the calendar in the list (used for subscribe and update_subscription)'
        ),
      hidden: z
        .boolean()
        .optional()
        .describe('Whether to hide the calendar (used for subscribe and update_subscription)'),
      selected: z
        .boolean()
        .optional()
        .describe(
          'Whether the calendar is selected in the UI (used for subscribe and update_subscription)'
        ),
      summaryOverride: z
        .string()
        .optional()
        .describe('Custom display name (used for subscribe and update_subscription)')
    })
  )
  .output(
    z.object({
      calendarId: z.string().optional().describe('Calendar ID'),
      summary: z.string().optional().describe('Calendar title'),
      description: z.string().optional().describe('Calendar description'),
      timeZone: z.string().optional().describe('Calendar time zone'),
      colorId: z.string().optional().describe('Calendar-list color ID'),
      hidden: z.boolean().optional().describe('Whether the calendar is hidden'),
      selected: z.boolean().optional().describe('Whether the calendar is selected'),
      summaryOverride: z.string().optional().describe('User-customized display name'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the calendar was deleted/unsubscribed'),
      action: z.string().describe('The action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    try {
      let client = new GoogleCalendarClient(ctx.auth.token);
      let { action } = ctx.input;

      if (action === 'create') {
        if (!ctx.input.summary)
          throw createApiServiceError('summary is required for creating a calendar');
        let cal = await client.createCalendar({
          summary: ctx.input.summary,
          description: ctx.input.description,
          location: ctx.input.location,
          timeZone: ctx.input.timeZone
        });
        return {
          output: {
            calendarId: cal.id,
            summary: cal.summary,
            description: cal.description,
            timeZone: cal.timeZone,
            action: 'create'
          },
          message: `Created calendar **"${cal.summary}"** with ID \`${cal.id}\`.`
        };
      }

      if (action === 'update') {
        if (!ctx.input.calendarId)
          throw createApiServiceError('calendarId is required for updating a calendar');
        let updates: any = {};
        if (ctx.input.summary !== undefined) updates.summary = ctx.input.summary;
        if (ctx.input.description !== undefined) updates.description = ctx.input.description;
        if (ctx.input.location !== undefined) updates.location = ctx.input.location;
        if (ctx.input.timeZone !== undefined) updates.timeZone = ctx.input.timeZone;

        let cal = await client.updateCalendar(ctx.input.calendarId, updates);
        return {
          output: {
            calendarId: cal.id,
            summary: cal.summary,
            description: cal.description,
            timeZone: cal.timeZone,
            action: 'update'
          },
          message: `Updated calendar **"${cal.summary}"**.`
        };
      }

      if (action === 'delete') {
        if (!ctx.input.calendarId)
          throw createApiServiceError('calendarId is required for deleting a calendar');
        await client.deleteCalendar(ctx.input.calendarId);
        return {
          output: {
            calendarId: ctx.input.calendarId,
            deleted: true,
            action: 'delete'
          },
          message: `Deleted calendar \`${ctx.input.calendarId}\`.`
        };
      }

      if (action === 'subscribe') {
        if (!ctx.input.calendarId)
          throw createApiServiceError('calendarId is required for subscribing to a calendar');
        let entry = await client.addCalendarToList(ctx.input.calendarId, {
          colorId: ctx.input.colorId,
          hidden: ctx.input.hidden,
          selected: ctx.input.selected,
          summaryOverride: ctx.input.summaryOverride
        });
        return {
          output: {
            calendarId: entry.id,
            summary: entry.summary,
            description: entry.description,
            timeZone: entry.timeZone,
            colorId: entry.colorId,
            hidden: entry.hidden,
            selected: entry.selected,
            summaryOverride: entry.summaryOverride,
            action: 'subscribe'
          },
          message: `Subscribed to calendar **"${entry.summary || entry.id}"**.`
        };
      }

      if (action === 'update_subscription') {
        if (!ctx.input.calendarId) {
          throw createApiServiceError(
            'calendarId is required for updating a calendar subscription'
          );
        }
        let updates = {
          colorId: ctx.input.colorId,
          hidden: ctx.input.hidden,
          selected: ctx.input.selected,
          summaryOverride: ctx.input.summaryOverride
        };
        if (Object.values(updates).every(value => value === undefined)) {
          throw createApiServiceError(
            'Provide at least one of colorId, hidden, selected, or summaryOverride for update_subscription.'
          );
        }

        let entry = await client.updateCalendarListEntry(ctx.input.calendarId, updates);
        return {
          output: {
            calendarId: entry.id ?? ctx.input.calendarId,
            summary: entry.summary,
            description: entry.description,
            timeZone: entry.timeZone,
            colorId: entry.colorId,
            hidden: entry.hidden,
            selected: entry.selected,
            summaryOverride: entry.summaryOverride,
            action: 'update_subscription'
          },
          message: `Updated subscription settings for calendar **"${entry.summary || entry.id || ctx.input.calendarId}"**.`
        };
      }

      if (action === 'unsubscribe') {
        if (!ctx.input.calendarId)
          throw createApiServiceError(
            'calendarId is required for unsubscribing from a calendar'
          );
        await client.removeCalendarFromList(ctx.input.calendarId);
        return {
          output: {
            calendarId: ctx.input.calendarId,
            deleted: true,
            action: 'unsubscribe'
          },
          message: `Unsubscribed from calendar \`${ctx.input.calendarId}\`.`
        };
      }

      throw createApiServiceError(`Unknown action: ${action}`);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Google Calendar',
        operation: 'manage calendar',
        reason: 'google_calendar_api_error',
        nestedKeys: ['error', 'errors']
      });
    }
  })
  .build();
