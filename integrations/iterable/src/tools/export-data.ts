import { SlateTool } from 'slates';
import { z } from 'zod';
import { IterableClient } from '../lib/client';
import { spec } from '../spec';

export let exportData = SlateTool.create(spec, {
  name: 'Export Data',
  key: 'export_data',
  description: `Exports user data, event data, or campaign metrics from Iterable as CSV. Supports exporting by data type and date range. Also supports exporting a specific user's events.`,
  instructions: [
    'Use dataTypeName to specify what to export: "user", "customEvent", "emailSend", "emailOpen", "emailClick", "emailBounce", "emailComplaint", "emailSubscribe", "emailUnsubscribe", "pushSend", "pushOpen", "pushBounce", "smsSend", "smsClick", "smsBounce", "inAppSend", "inAppOpen", "inAppClick", etc.'
  ],
  constraints: ['Exports are limited to 100GB total, with files up to 10MB each.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      exportType: z
        .enum(['data', 'userEvents'])
        .describe('Type of export: bulk data export or specific user event export'),
      dataTypeName: z
        .string()
        .optional()
        .describe('Data type to export (required for data export)'),
      range: z
        .string()
        .optional()
        .describe('Predefined range: "Today", "Yesterday", "Before today", "All"'),
      startDateTime: z
        .string()
        .optional()
        .describe('Start datetime for custom range (ISO 8601)'),
      endDateTime: z.string().optional().describe('End datetime for custom range (ISO 8601)'),
      campaignId: z.number().optional().describe('Filter export by campaign ID'),
      email: z.string().optional().describe('User email (for userEvents export)'),
      userId: z.string().optional().describe('User ID (for userEvents export)'),
      includeCustomEvents: z
        .boolean()
        .optional()
        .describe('Include custom events (for userEvents export)')
    })
  )
  .output(
    z.object({
      exportId: z
        .string()
        .optional()
        .describe('ID of the export job (for async data exports)'),
      events: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('User events (for userEvents export)'),
      message: z.string().describe('Result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IterableClient({
      token: ctx.auth.token,
      dataCenter: ctx.config.dataCenter
    });

    if (ctx.input.exportType === 'userEvents') {
      let result = await client.exportUserEvents({
        email: ctx.input.email,
        userId: ctx.input.userId,
        includeCustomEvents: ctx.input.includeCustomEvents
      });
      let events = result.events || [];
      return {
        output: {
          events,
          message: `Exported ${events.length} event(s) for user.`
        },
        message: `Exported **${events.length}** event(s) for user **${ctx.input.email || ctx.input.userId}**.`
      };
    }

    // data export
    let result = await client.exportData({
      dataTypeName: ctx.input.dataTypeName!,
      range: ctx.input.range,
      startDateTime: ctx.input.startDateTime,
      endDateTime: ctx.input.endDateTime,
      campaignId: ctx.input.campaignId
    });
    return {
      output: {
        exportId: result.exportId,
        message: `Data export started for "${ctx.input.dataTypeName}".`
      },
      message: `Started data export for **${ctx.input.dataTypeName}**. Export ID: **${result.exportId || 'N/A'}**.`
    };
  })
  .build();
