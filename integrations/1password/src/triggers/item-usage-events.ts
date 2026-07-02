import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { EventsClient } from '../lib/events-client';
import { spec } from '../spec';

export let itemUsageEventsTrigger = SlateTrigger.create(spec, {
  name: 'Item Usage Events',
  key: 'item_usage_events',
  description:
    'Monitors when items in shared vaults are accessed, modified, or used. Tracks which user accessed which item and from where, useful for security auditing and compliance.'
})
  .input(
    z.object({
      eventUuid: z.string().describe('Unique identifier of the usage event'),
      timestamp: z.string().describe('When the item was accessed'),
      action: z.string().describe('The type of usage action'),
      itemUuid: z.string().describe('UUID of the item that was accessed'),
      vaultUuid: z.string().describe('UUID of the vault containing the item'),
      userUuid: z.string().describe('UUID of the user who accessed the item'),
      userName: z.string().optional().describe('Name of the user'),
      userEmail: z.string().optional().describe('Email of the user'),
      appName: z.string().optional().describe('Application used to access the item'),
      platformName: z
        .string()
        .optional()
        .describe('Platform from which the item was accessed'),
      osName: z
        .string()
        .optional()
        .describe('Operating system from which the item was accessed'),
      country: z.string().optional().describe('Country from which the item was accessed'),
      region: z.string().optional().describe('Region from which the item was accessed'),
      city: z.string().optional().describe('City from which the item was accessed')
    })
  )
  .output(
    z.object({
      eventUuid: z.string().describe('Unique identifier of the usage event'),
      timestamp: z.string().describe('When the item was accessed'),
      action: z.string().describe('The usage action (e.g., secure-copy, reveal, fill)'),
      itemUuid: z.string().describe('UUID of the item that was accessed'),
      vaultUuid: z.string().describe('UUID of the vault containing the item'),
      userUuid: z.string().describe('UUID of the user who accessed the item'),
      userName: z.string().optional().describe('Name of the user who accessed the item'),
      userEmail: z.string().optional().describe('Email of the user who accessed the item'),
      appName: z
        .string()
        .optional()
        .describe('Application used (e.g., 1Password Browser Extension)'),
      platformName: z.string().optional().describe('Platform used (e.g., Chrome, macOS)'),
      osName: z.string().optional().describe('Operating system used'),
      country: z.string().optional().describe('Country from which the item was accessed'),
      region: z.string().optional().describe('Region from which the item was accessed'),
      city: z.string().optional().describe('City from which the item was accessed')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new EventsClient({
        token: ctx.auth.token,
        region: ctx.config.eventsApiRegion || 'us'
      });

      let cursor = ctx.state?.cursor as string | undefined;

      let params = cursor
        ? { cursor }
        : { startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() };

      let response = await client.getItemUsageEvents(params);

      let inputs = response.items.map(event => ({
        eventUuid: event.uuid,
        timestamp: event.timestamp,
        action: event.action,
        itemUuid: event.itemUuid,
        vaultUuid: event.vaultUuid,
        userUuid: event.user?.uuid,
        userName: event.user?.name,
        userEmail: event.user?.email,
        appName: event.client?.appName,
        platformName: event.client?.platformName,
        osName: event.client?.osName,
        country: event.location?.country,
        region: event.location?.region,
        city: event.location?.city
      }));

      return {
        inputs,
        updatedState: {
          cursor: response.cursor
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `item_usage.${ctx.input.action.toLowerCase()}`,
        id: ctx.input.eventUuid,
        output: {
          eventUuid: ctx.input.eventUuid,
          timestamp: ctx.input.timestamp,
          action: ctx.input.action,
          itemUuid: ctx.input.itemUuid,
          vaultUuid: ctx.input.vaultUuid,
          userUuid: ctx.input.userUuid,
          userName: ctx.input.userName,
          userEmail: ctx.input.userEmail,
          appName: ctx.input.appName,
          platformName: ctx.input.platformName,
          osName: ctx.input.osName,
          country: ctx.input.country,
          region: ctx.input.region,
          city: ctx.input.city
        }
      };
    }
  })
  .build();
