import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { OktaClient } from '../lib/client';
import { spec } from '../spec';

let eventTargetSchema = z.object({
  targetId: z.string(),
  targetType: z.string(),
  displayName: z.string().optional(),
  alternateId: z.string().optional()
});

export let eventHookTrigger = SlateTrigger.create(spec, {
  name: 'Event Hook',
  key: 'event_hook',
  description:
    'Receives Okta event hook notifications for user lifecycle, authentication, group, application, policy, and security events. Supports auto-registration of webhooks with Okta.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event UUID'),
      eventType: z.string().describe('Okta event type identifier'),
      published: z.string().describe('ISO 8601 timestamp'),
      severity: z.string().describe('Event severity'),
      displayMessage: z.string().describe('Human-readable description'),
      actorId: z.string(),
      actorType: z.string(),
      actorDisplayName: z.string().optional(),
      actorAlternateId: z.string().optional(),
      outcomeResult: z.string(),
      outcomeReason: z.string().optional(),
      targets: z.array(eventTargetSchema).optional(),
      rawEvent: z.record(z.string(), z.any()).describe('Full raw event payload from Okta')
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
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new OktaClient({
        domain: ctx.config.domain,
        token: ctx.auth.token
      });

      // Register an event hook with Okta for common event types
      let eventTypes = [
        'user.lifecycle.create',
        'user.lifecycle.activate',
        'user.lifecycle.deactivate',
        'user.lifecycle.suspend',
        'user.lifecycle.unsuspend',
        'user.lifecycle.delete.initiated',
        'user.account.update_profile',
        'user.account.update_password',
        'user.account.reset_password',
        'user.account.lock',
        'user.account.unlock',
        'user.session.start',
        'user.session.end',
        'user.authentication.auth_via_mfa',
        'user.authentication.sso',
        'group.user_membership.add',
        'group.user_membership.remove',
        'application.user_membership.add',
        'application.user_membership.remove',
        'application.lifecycle.create',
        'application.lifecycle.update',
        'application.lifecycle.delete',
        'policy.lifecycle.update',
        'policy.lifecycle.create',
        'policy.lifecycle.delete',
        'security.threat.detected'
      ];

      let hook = await client.createEventHook({
        name: `Slates Event Hook`,
        url: ctx.input.webhookBaseUrl,
        eventTypes
      });

      // Verify the event hook so Okta can start sending events
      try {
        await client.verifyEventHook(hook.id);
      } catch {
        // Verification will be handled by the handleRequest when Okta sends the verification challenge
      }

      return {
        registrationDetails: {
          eventHookId: hook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new OktaClient({
        domain: ctx.config.domain,
        token: ctx.auth.token
      });

      let hookId = ctx.input.registrationDetails?.eventHookId;
      if (hookId) {
        try {
          await client.deactivateEventHook(hookId);
        } catch {
          // May already be inactive
        }
        await client.deleteEventHook(hookId);
      }
    },

    handleRequest: async ctx => {
      let request = ctx.request;

      // Handle Okta verification challenge (one-time GET request)
      if (request.method === 'GET') {
        let _url = new URL(request.url);
        let challenge = request.headers.get('x-okta-verification-challenge');
        if (challenge) {
          // Return the challenge as a JSON response — Okta expects this
          // Note: Slates framework handles the response; we return empty inputs for verification
          return {
            inputs: [],
            updatedState: {
              verified: true,
              verificationChallenge: challenge
            }
          };
        }
        return { inputs: [] };
      }

      // Handle event notification (POST request)
      let body: any;
      try {
        body = await request.json();
      } catch {
        return { inputs: [] };
      }

      // Okta sends events in a `data.events` array
      let events: any[] = body?.data?.events || [];

      let inputs = events.map((event: any) => ({
        eventId: event.uuid || '',
        eventType: event.eventType || '',
        published: event.published || '',
        severity: event.severity || '',
        displayMessage: event.displayMessage || '',
        actorId: event.actor?.id || '',
        actorType: event.actor?.type || '',
        actorDisplayName: event.actor?.displayName,
        actorAlternateId: event.actor?.alternateId,
        outcomeResult: event.outcome?.result || '',
        outcomeReason: event.outcome?.reason,
        targets: event.target?.map((t: any) => ({
          targetId: t.id || '',
          targetType: t.type || '',
          displayName: t.displayName,
          alternateId: t.alternateId
        })),
        rawEvent: event
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let { eventType } = ctx.input;

      // Map Okta event types to simplified categories
      let type = eventType; // Use the full Okta event type as-is

      let primaryTarget = ctx.input.targets?.[0];

      return {
        type,
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
