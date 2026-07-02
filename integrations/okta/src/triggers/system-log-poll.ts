import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { OktaClient } from '../lib/client';
import { spec } from '../spec';

let eventTargetSchema = z.object({
  targetId: z.string(),
  targetType: z.string(),
  displayName: z.string().optional(),
  alternateId: z.string().optional()
});

export let systemLogPollTrigger = SlateTrigger.create(spec, {
  name: 'System Log Events',
  key: 'system_log_poll',
  description:
    '[Polling fallback] Polls the Okta System Log for new events. Captures authentication attempts, user lifecycle changes, policy changes, administrative actions, and more. Use this as a fallback when event hooks cannot be configured.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event UUID'),
      eventType: z.string().describe('Okta event type identifier'),
      published: z.string().describe('ISO 8601 timestamp'),
      severity: z.string(),
      displayMessage: z.string(),
      actorId: z.string(),
      actorType: z.string(),
      actorDisplayName: z.string().optional(),
      actorAlternateId: z.string().optional(),
      outcomeResult: z.string(),
      outcomeReason: z.string().optional(),
      targets: z.array(eventTargetSchema).optional()
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Unique event UUID'),
      eventType: z.string().describe('Okta event type, e.g. user.session.start'),
      published: z.string().describe('When the event occurred'),
      severity: z.string(),
      displayMessage: z.string(),
      actorId: z.string(),
      actorType: z.string(),
      actorDisplayName: z.string().optional(),
      actorAlternateId: z.string().optional(),
      outcomeResult: z.string(),
      outcomeReason: z.string().optional(),
      targets: z.array(eventTargetSchema).optional(),
      primaryTargetId: z.string().optional().describe('ID of the first target resource'),
      primaryTargetType: z.string().optional().describe('Type of the first target resource')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new OktaClient({
        domain: ctx.config.domain,
        token: ctx.auth.token,
        authMethod: ctx.auth.authMethod
      });

      // Use the last polled timestamp or default to 10 minutes ago
      let since =
        ctx.state?.lastPublished || new Date(Date.now() - 10 * 60 * 1000).toISOString();

      let result = await client.getSystemLogs({
        since,
        sortOrder: 'ASCENDING',
        limit: 100
      });

      let inputs = result.items.map(e => ({
        eventId: e.uuid,
        eventType: e.eventType,
        published: e.published,
        severity: e.severity,
        displayMessage: e.displayMessage,
        actorId: e.actor.id,
        actorType: e.actor.type,
        actorDisplayName: e.actor.displayName,
        actorAlternateId: e.actor.alternateId,
        outcomeResult: e.outcome.result,
        outcomeReason: e.outcome.reason,
        targets: e.target?.map(t => ({
          targetId: t.id,
          targetType: t.type,
          displayName: t.displayName,
          alternateId: t.alternateId
        }))
      }));

      // Track the latest event timestamp for next poll
      let lastPublished = since;
      if (result.items.length > 0) {
        let latestEvent = result.items[result.items.length - 1];
        if (latestEvent) {
          lastPublished = latestEvent.published;
        }
      }

      return {
        inputs,
        updatedState: {
          lastPublished
        }
      };
    },

    handleEvent: async ctx => {
      let primaryTarget = ctx.input.targets?.[0];

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          eventId: ctx.input.eventId,
          eventType: ctx.input.eventType,
          published: ctx.input.published,
          severity: ctx.input.severity,
          displayMessage: ctx.input.displayMessage,
          actorId: ctx.input.actorId,
          actorType: ctx.input.actorType,
          actorDisplayName: ctx.input.actorDisplayName,
          actorAlternateId: ctx.input.actorAlternateId,
          outcomeResult: ctx.input.outcomeResult,
          outcomeReason: ctx.input.outcomeReason,
          targets: ctx.input.targets,
          primaryTargetId: primaryTarget?.targetId,
          primaryTargetType: primaryTarget?.targetType
        }
      };
    }
  })
  .build();
