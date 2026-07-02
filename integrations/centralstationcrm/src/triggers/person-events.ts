import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let personEvents = SlateTrigger.create(spec, {
  name: 'Person Events',
  key: 'person_events',
  description: 'Triggers when a person is created, updated, or deleted in CentralStationCRM.'
})
  .input(
    z.object({
      eventAction: z
        .string()
        .describe('The action that triggered the event (create, update, destroy)'),
      personId: z.number().describe('ID of the affected person'),
      firstName: z.string().optional().describe('First name of the person'),
      lastName: z.string().optional().describe('Last name of the person'),
      rawPayload: z.any().describe('Complete webhook payload')
    })
  )
  .output(
    z.object({
      personId: z.number().describe('ID of the person'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      title: z.string().optional().describe('Title'),
      gender: z.string().optional().describe('Gender'),
      background: z.string().optional().describe('Background information'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accountName: ctx.config.accountName
      });

      let createHook = await client.createWebhook({
        url: `${ctx.input.webhookBaseUrl}/create`,
        object_type: 'Person',
        action: 'create'
      });

      let updateHook = await client.createWebhook({
        url: `${ctx.input.webhookBaseUrl}/update`,
        object_type: 'Person',
        action: 'update'
      });

      let deleteHook = await client.createWebhook({
        url: `${ctx.input.webhookBaseUrl}/destroy`,
        object_type: 'Person',
        action: 'destroy'
      });

      return {
        registrationDetails: {
          createHookId: (createHook?.hook ?? createHook)?.id,
          updateHookId: (updateHook?.hook ?? updateHook)?.id,
          deleteHookId: (deleteHook?.hook ?? deleteHook)?.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accountName: ctx.config.accountName
      });

      let details = ctx.input.registrationDetails as Record<string, number>;
      if (details.createHookId) await client.deleteWebhook(details.createHookId);
      if (details.updateHookId) await client.deleteWebhook(details.updateHookId);
      if (details.deleteHookId) await client.deleteWebhook(details.deleteHookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let url = new URL(ctx.request.url);
      let pathParts = url.pathname.split('/');
      let actionFromPath = pathParts[pathParts.length - 1] ?? 'unknown';

      let person = data?.person ?? data;

      return {
        inputs: [
          {
            eventAction: actionFromPath,
            personId: person?.id ?? 0,
            firstName: person?.first_name,
            lastName: person?.name,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let person = ctx.input.rawPayload?.person ?? ctx.input.rawPayload;

      return {
        type: `person.${ctx.input.eventAction === 'destroy' ? 'deleted' : ctx.input.eventAction === 'create' ? 'created' : 'updated'}`,
        id: `person_${ctx.input.personId}_${ctx.input.eventAction}_${Date.now()}`,
        output: {
          personId: ctx.input.personId,
          firstName: person?.first_name ?? ctx.input.firstName,
          lastName: person?.name ?? ctx.input.lastName,
          title: person?.title,
          gender: person?.gender,
          background: person?.background,
          createdAt: person?.created_at,
          updatedAt: person?.updated_at
        }
      };
    }
  })
  .build();
