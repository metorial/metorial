import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { EventsClient } from '../lib/events-client';
import { spec } from '../spec';

export let signInAttemptEventsTrigger = SlateTrigger.create(spec, {
  name: 'Sign-In Attempt Events',
  key: 'sign_in_attempt_events',
  description:
    'Monitors sign-in attempts to the 1Password account. Tracks successful and failed sign-ins, including the user, IP address, location, client information, and failure reasons. Useful for detecting unauthorized access attempts.'
})
  .input(
    z.object({
      eventUuid: z.string().describe('Unique identifier of the sign-in attempt event'),
      sessionUuid: z.string().optional().describe('UUID of the session'),
      timestamp: z.string().describe('When the sign-in attempt occurred'),
      category: z
        .string()
        .describe('Category of the sign-in attempt (e.g., success, credentials_failed)'),
      type: z.string().describe('Type of sign-in attempt'),
      targetUserUuid: z.string().describe('UUID of the user targeted by the sign-in attempt'),
      targetUserName: z.string().optional().describe('Name of the user'),
      targetUserEmail: z.string().optional().describe('Email of the user'),
      appName: z.string().optional().describe('Application used for the sign-in attempt'),
      platformName: z.string().optional().describe('Platform used for the sign-in attempt'),
      osName: z.string().optional().describe('Operating system used for the sign-in attempt'),
      country: z.string().optional().describe('Country from which the sign-in was attempted'),
      region: z.string().optional().describe('Region from which the sign-in was attempted'),
      city: z.string().optional().describe('City from which the sign-in was attempted'),
      detailsValue: z
        .string()
        .optional()
        .describe('Additional details about the sign-in attempt (e.g., failure reason)')
    })
  )
  .output(
    z.object({
      eventUuid: z.string().describe('Unique identifier of the sign-in attempt event'),
      sessionUuid: z.string().optional().describe('UUID of the session'),
      timestamp: z.string().describe('When the sign-in attempt occurred'),
      category: z
        .string()
        .describe('Category (e.g., success, firewall_failed, mfa_failed, credentials_failed)'),
      type: z.string().describe('Type of sign-in attempt'),
      targetUserUuid: z.string().describe('UUID of the user targeted by the sign-in attempt'),
      targetUserName: z.string().optional().describe('Name of the user'),
      targetUserEmail: z.string().optional().describe('Email of the user'),
      appName: z
        .string()
        .optional()
        .describe('Application used (e.g., 1Password for Mac, 1Password Browser Extension)'),
      platformName: z.string().optional().describe('Platform used (e.g., Chrome, macOS)'),
      osName: z.string().optional().describe('Operating system used'),
      country: z.string().optional().describe('Country from which the sign-in was attempted'),
      region: z.string().optional().describe('Region from which the sign-in was attempted'),
      city: z.string().optional().describe('City from which the sign-in was attempted'),
      detailsValue: z
        .string()
        .optional()
        .describe('Additional details about the attempt (e.g., failure reason)')
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

      let response = await client.getSignInAttemptEvents(params);

      let inputs = response.items.map(event => ({
        eventUuid: event.uuid,
        sessionUuid: event.sessionUuid,
        timestamp: event.timestamp,
        category: event.category,
        type: event.type,
        targetUserUuid: event.targetUser?.uuid,
        targetUserName: event.targetUser?.name,
        targetUserEmail: event.targetUser?.email,
        appName: event.client?.appName,
        platformName: event.client?.platformName,
        osName: event.client?.osName,
        country: event.location?.country,
        region: event.location?.region,
        city: event.location?.city,
        detailsValue: event.details?.value
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
        type: `sign_in_attempt.${ctx.input.category.toLowerCase()}`,
        id: ctx.input.eventUuid,
        output: {
          eventUuid: ctx.input.eventUuid,
          sessionUuid: ctx.input.sessionUuid,
          timestamp: ctx.input.timestamp,
          category: ctx.input.category,
          type: ctx.input.type,
          targetUserUuid: ctx.input.targetUserUuid,
          targetUserName: ctx.input.targetUserName,
          targetUserEmail: ctx.input.targetUserEmail,
          appName: ctx.input.appName,
          platformName: ctx.input.platformName,
          osName: ctx.input.osName,
          country: ctx.input.country,
          region: ctx.input.region,
          city: ctx.input.city,
          detailsValue: ctx.input.detailsValue
        }
      };
    }
  })
  .build();
