import { SlateTool } from 'slates';
import { z } from 'zod';
import { OktaClient } from '../lib/client';
import { oktaServiceError } from '../lib/errors';
import type { OktaEventHook } from '../lib/types';
import { spec } from '../spec';

let eventHookSchema = z.object({
  eventHookId: z.string().describe('Unique Okta event hook ID'),
  name: z.string().describe('Event hook display name'),
  status: z.string().describe('Current event hook status'),
  url: z.string().optional().describe('Delivery URL configured for the event hook'),
  eventTypes: z.array(z.string()).describe('Subscribed Okta event type identifiers'),
  authSchemeType: z.string().optional().describe('Authorization scheme type, if set'),
  created: z.string().optional(),
  lastUpdated: z.string().optional()
});

let mapEventHook = (hook: OktaEventHook) => ({
  eventHookId: hook.id,
  name: hook.name,
  status: hook.status,
  url: hook.channel.config.uri,
  eventTypes: hook.events.items,
  authSchemeType: hook.channel.config.authScheme?.type,
  created: hook.created,
  lastUpdated: hook.lastUpdated
});

let requireEventHookId = (eventHookId: string | undefined, action: string) => {
  if (!eventHookId) {
    throw oktaServiceError(`Event hook ID is required for ${action} action`);
  }

  return eventHookId;
};

export let manageEventHookTool = SlateTool.create(spec, {
  name: 'Manage Event Hook',
  key: 'manage_event_hook',
  description:
    'Create, read, update, delete, list, and run lifecycle operations for Okta event hooks. Event hooks deliver selected Okta system events to an HTTPS endpoint.',
  instructions: [
    'Create and update actions require an HTTPS URL and Okta event type identifiers such as `user.lifecycle.create`.',
    'The verify action requires the destination endpoint to respond to the Okta verification challenge.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'create',
          'get',
          'update',
          'delete',
          'list',
          'activate',
          'deactivate',
          'verify'
        ])
        .describe('Event hook operation to perform'),
      eventHookId: z
        .string()
        .optional()
        .describe(
          'Event hook ID. Required for get, update, delete, activate, deactivate, and verify actions'
        ),
      name: z
        .string()
        .optional()
        .describe('Event hook name. Required for create and optional for update'),
      url: z
        .string()
        .optional()
        .describe('HTTPS delivery URL. Required for create and optional for update'),
      eventTypes: z
        .array(z.string())
        .optional()
        .describe(
          'Okta event types to subscribe to. Required for create and optional for update'
        ),
      authorizationHeaderValue: z
        .string()
        .optional()
        .describe('Optional Authorization header value Okta sends with event hook requests')
    })
  )
  .output(
    z.object({
      action: z.string(),
      success: z.boolean(),
      eventHook: eventHookSchema.optional().describe('Affected event hook'),
      eventHooks: z.array(eventHookSchema).optional().describe('Event hooks returned by list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OktaClient({
      domain: ctx.config.domain,
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let { action, eventHookId, name, url, eventTypes, authorizationHeaderValue } = ctx.input;

    if (action === 'list') {
      let hooks = await client.listEventHooks();
      let eventHooks = hooks.map(mapEventHook);
      return {
        output: { action, success: true, eventHooks },
        message: `Found **${eventHooks.length}** Okta event hook(s).`
      };
    }

    if (action === 'create') {
      if (!name) throw oktaServiceError('Event hook name is required for create action');
      if (!url) throw oktaServiceError('Event hook HTTPS URL is required for create action');
      if (!eventTypes?.length) {
        throw oktaServiceError('At least one event type is required for create action');
      }

      let hook = await client.createEventHook({
        name,
        url,
        eventTypes,
        authorizationHeaderValue
      });
      let eventHook = mapEventHook(hook);
      return {
        output: { action, success: true, eventHook },
        message: `Created Okta event hook **${eventHook.name}** (\`${eventHook.eventHookId}\`).`
      };
    }

    let requiredEventHookId = requireEventHookId(eventHookId, action);

    if (action === 'get') {
      let hook = await client.getEventHook(requiredEventHookId);
      let eventHook = mapEventHook(hook);
      return {
        output: { action, success: true, eventHook },
        message: `Retrieved Okta event hook **${eventHook.name}** (\`${eventHook.eventHookId}\`).`
      };
    }

    if (action === 'update') {
      if (!name && !url && !eventTypes?.length && !authorizationHeaderValue) {
        throw oktaServiceError(
          'Provide name, url, eventTypes, or authorizationHeaderValue for update action'
        );
      }

      let hook = await client.updateEventHook(requiredEventHookId, {
        name,
        url,
        eventTypes,
        authorizationHeaderValue
      });
      let eventHook = mapEventHook(hook);
      return {
        output: { action, success: true, eventHook },
        message: `Updated Okta event hook **${eventHook.name}** (\`${eventHook.eventHookId}\`).`
      };
    }

    if (action === 'delete') {
      await client.deleteEventHook(requiredEventHookId);
      return {
        output: {
          action,
          success: true,
          eventHook: {
            eventHookId: requiredEventHookId,
            name: '',
            status: 'DELETED',
            eventTypes: []
          }
        },
        message: `Deleted Okta event hook \`${requiredEventHookId}\`.`
      };
    }

    if (action === 'activate') {
      let hook = await client.activateEventHook(requiredEventHookId);
      let eventHook = mapEventHook(hook);
      return {
        output: { action, success: true, eventHook },
        message: `Activated Okta event hook **${eventHook.name}** (\`${eventHook.eventHookId}\`).`
      };
    }

    if (action === 'deactivate') {
      let hook = await client.deactivateEventHook(requiredEventHookId);
      let eventHook = mapEventHook(hook);
      return {
        output: { action, success: true, eventHook },
        message: `Deactivated Okta event hook **${eventHook.name}** (\`${eventHook.eventHookId}\`).`
      };
    }

    if (action === 'verify') {
      let hook = await client.verifyEventHook(requiredEventHookId);
      let eventHook = mapEventHook(hook);
      return {
        output: { action, success: true, eventHook },
        message: `Requested verification for Okta event hook **${eventHook.name}** (\`${eventHook.eventHookId}\`).`
      };
    }

    throw oktaServiceError(`Unknown action: ${action}`);
  })
  .build();
