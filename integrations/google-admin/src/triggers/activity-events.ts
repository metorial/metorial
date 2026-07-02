import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';

export let activityEvents = SlateTrigger.create(spec, {
  name: 'Activity Events',
  key: 'activity_events',
  description:
    '[Polling fallback] Poll for new audit activity events including admin actions, user logins, Drive activity, mobile device events, OAuth token grants, and other application activities.'
})
  .scopes(googleAdminActionScopes.activityEvents)
  .input(
    z.object({
      activityId: z.string().describe('Unique identifier for the activity event'),
      actorEmail: z.string().optional().describe('Email of the actor who triggered the event'),
      ipAddress: z.string().optional().describe('IP address of the actor'),
      time: z.string().optional().describe('Time of the activity event'),
      applicationName: z.string().optional().describe('Application that generated the event'),
      eventName: z.string().optional().describe('Name of the event'),
      eventType: z.string().optional().describe('Type of the event'),
      parameters: z
        .array(
          z.object({
            name: z.string().optional(),
            value: z.string().optional()
          })
        )
        .optional()
        .describe('Event parameters')
    })
  )
  .output(
    z.object({
      actorEmail: z.string().optional().describe('Email of the actor who triggered the event'),
      ipAddress: z.string().optional().describe('IP address of the actor'),
      time: z.string().optional().describe('Time the event occurred'),
      applicationName: z.string().optional().describe('Application that generated the event'),
      eventName: z.string().optional().describe('Name of the event'),
      eventType: z.string().optional().describe('Type of the event'),
      parameters: z
        .array(
          z.object({
            name: z.string().optional(),
            value: z.string().optional()
          })
        )
        .optional()
        .describe('Additional event parameters')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        customerId: ctx.config.customerId,
        domain: ctx.config.domain
      });

      // Poll across key application types
      let applicationNames = ['admin', 'login', 'drive', 'token', 'user_accounts'];
      let lastPollTime = ctx.state?.lastPollTime as string | undefined;

      // Default to 1 hour ago if no state
      let startTime = lastPollTime || new Date(Date.now() - 60 * 60 * 1000).toISOString();
      let newPollTime = new Date().toISOString();

      let allInputs: Array<{
        activityId: string;
        actorEmail?: string;
        ipAddress?: string;
        time?: string;
        applicationName?: string;
        eventName?: string;
        eventType?: string;
        parameters?: Array<{ name?: string; value?: string }>;
      }> = [];

      for (let appName of applicationNames) {
        try {
          let result = await client.listActivities({
            userKey: 'all',
            applicationName: appName,
            startTime,
            maxResults: 50
          });

          let items = result.items || [];

          for (let item of items) {
            let events = item.events || [];
            for (let event of events) {
              let activityId = `${item.id?.uniqueQualifier || ''}-${item.id?.time || ''}-${event.name || ''}`;

              allInputs.push({
                activityId,
                actorEmail: item.actor?.email,
                ipAddress: item.ipAddress,
                time: item.id?.time,
                applicationName: appName,
                eventName: event.name,
                eventType: event.type,
                parameters: (event.parameters || []).map((p: any) => ({
                  name: p.name,
                  value:
                    p.value ||
                    (p.intValue ? String(p.intValue) : undefined) ||
                    (p.boolValue !== undefined ? String(p.boolValue) : undefined)
                }))
              });
            }
          }
        } catch {
          // Some application types might not be available, skip
        }
      }

      return {
        inputs: allInputs,
        updatedState: {
          lastPollTime: newPollTime
        }
      };
    },

    handleEvent: async ctx => {
      let eventType = `${ctx.input.applicationName || 'unknown'}.${ctx.input.eventName || 'unknown'}`;

      return {
        type: eventType.toLowerCase(),
        id: ctx.input.activityId,
        output: {
          actorEmail: ctx.input.actorEmail,
          ipAddress: ctx.input.ipAddress,
          time: ctx.input.time,
          applicationName: ctx.input.applicationName,
          eventName: ctx.input.eventName,
          eventType: ctx.input.eventType,
          parameters: ctx.input.parameters
        }
      };
    }
  })
  .build();
