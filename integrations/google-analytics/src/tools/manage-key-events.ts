import { SlateTool } from 'slates';
import { z } from 'zod';
import { AnalyticsAdminClient } from '../lib/client';
import { googleAnalyticsServiceError } from '../lib/errors';
import {
  propertyIdInstructions,
  propertyIdSchema,
  resolvePropertyId
} from '../lib/properties';
import { googleAnalyticsActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageKeyEvents = SlateTool.create(spec, {
  name: 'Manage Key Events',
  key: 'manage_key_events',
  description: `List, create, update, or delete key events (conversions) on a GA4 property. Key events mark specific user actions as valuable for your business (e.g., purchases, sign-ups, form submissions).

Previously known as "conversion events" in Google Analytics.`,
  instructions: propertyIdInstructions,
  tags: {
    destructive: false
  }
})
  .scopes(googleAnalyticsActionScopes.manageKeyEvents)
  .input(
    z.object({
      propertyId: propertyIdSchema,
      action: z
        .enum(['list', 'create', 'get', 'update', 'delete'])
        .describe('Action to perform on key events.'),
      keyEventId: z
        .string()
        .optional()
        .describe('ID of the key event (required for get, update, and delete actions).'),
      eventName: z
        .string()
        .optional()
        .describe(
          'Event name to mark as a key event (required for create). Must match an existing GA4 event name.'
        ),
      countingMethod: z
        .enum(['ONCE_PER_EVENT', 'ONCE_PER_SESSION'])
        .optional()
        .describe(
          'How to count conversions. ONCE_PER_EVENT counts every occurrence, ONCE_PER_SESSION counts once per session.'
        ),
      pageSize: z.number().optional(),
      pageToken: z.string().optional()
    })
  )
  .output(
    z.object({
      keyEvents: z
        .array(
          z.object({
            name: z.string().optional(),
            eventName: z.string().optional(),
            countingMethod: z.string().optional(),
            createTime: z.string().optional(),
            custom: z.boolean().optional(),
            deletable: z.boolean().optional()
          })
        )
        .optional()
        .describe('List of key events (for list action).'),
      keyEvent: z
        .object({
          name: z.string().optional(),
          eventName: z.string().optional(),
          countingMethod: z.string().optional(),
          createTime: z.string().optional(),
          custom: z.boolean().optional(),
          deletable: z.boolean().optional()
        })
        .optional()
        .describe('Key event details (for get/create/update actions).'),
      deleted: z.boolean().optional(),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AnalyticsAdminClient({
      token: ctx.auth.token
    });
    const propertyId = resolvePropertyId(ctx.input, ctx.config);

    if (ctx.input.action === 'list') {
      let result = await client.listKeyEvents(propertyId, {
        pageSize: ctx.input.pageSize,
        pageToken: ctx.input.pageToken
      });
      let events = result.keyEvents || [];
      return {
        output: {
          keyEvents: events,
          nextPageToken: result.nextPageToken
        },
        message: `Found **${events.length}** key event(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.keyEventId)
        throw googleAnalyticsServiceError('keyEventId is required for get action.');
      let result = await client.getKeyEvent(propertyId, ctx.input.keyEventId);
      return {
        output: { keyEvent: result },
        message: `Retrieved key event **${result.eventName}** (counting: ${result.countingMethod}).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.eventName)
        throw googleAnalyticsServiceError('eventName is required for create action.');
      let body: any = { eventName: ctx.input.eventName };
      if (ctx.input.countingMethod) body.countingMethod = ctx.input.countingMethod;
      let result = await client.createKeyEvent(propertyId, body);
      return {
        output: { keyEvent: result },
        message: `Created key event **${result.eventName}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.keyEventId)
        throw googleAnalyticsServiceError('keyEventId is required for update action.');
      let updateFields: string[] = [];
      let body: any = {};
      if (ctx.input.countingMethod !== undefined) {
        updateFields.push('countingMethod');
        body.countingMethod = ctx.input.countingMethod;
      }
      if (updateFields.length === 0) {
        throw googleAnalyticsServiceError(
          'At least one field (countingMethod) must be provided for update.'
        );
      }
      let result = await client.updateKeyEvent(
        propertyId,
        ctx.input.keyEventId,
        updateFields.join(','),
        body
      );
      return {
        output: { keyEvent: result },
        message: `Updated key event **${result.eventName}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.keyEventId)
        throw googleAnalyticsServiceError('keyEventId is required for delete action.');
      await client.deleteKeyEvent(propertyId, ctx.input.keyEventId);
      return {
        output: { deleted: true },
        message: `Deleted key event **${ctx.input.keyEventId}**.`
      };
    }

    throw googleAnalyticsServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
