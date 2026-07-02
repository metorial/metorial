import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let partyEvents = SlateTrigger.create(spec, {
  name: 'Party Events',
  key: 'party_events',
  description:
    'Triggered when a contact (person or organisation) is created, updated, or deleted in Capsule CRM.'
})
  .input(
    z.object({
      eventType: z
        .enum(['party/created', 'party/updated', 'party/deleted'])
        .describe('Type of party event'),
      parties: z.array(z.any()).describe('Party records from the webhook payload')
    })
  )
  .output(
    z.object({
      partyId: z.number().describe('ID of the affected party'),
      type: z.string().optional().describe('"person" or "organisation"'),
      firstName: z.string().optional().describe('First name (persons)'),
      lastName: z.string().optional().describe('Last name (persons)'),
      name: z.string().optional().describe('Organisation name'),
      jobTitle: z.string().optional().describe('Job title'),
      about: z.string().optional().describe('Description'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Update timestamp'),
      emailAddresses: z.array(z.any()).optional().describe('Email addresses'),
      phoneNumbers: z.array(z.any()).optional().describe('Phone numbers'),
      addresses: z.array(z.any()).optional().describe('Addresses'),
      websites: z.array(z.any()).optional().describe('Websites'),
      owner: z.any().optional().describe('Assigned owner'),
      team: z.any().optional().describe('Assigned team')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new CapsuleClient({ token: ctx.auth.token });

      let events = ['party/created', 'party/updated', 'party/deleted'];
      let hooks: Array<{ hookId: number; event: string }> = [];

      for (let event of events) {
        let hook = await client.createRestHook({
          event,
          targetUrl: ctx.input.webhookBaseUrl,
          description: `Slates: ${event}`
        });
        hooks.push({ hookId: hook.id, event });
      }

      return {
        registrationDetails: { hooks }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new CapsuleClient({ token: ctx.auth.token });
      let hooks = (ctx.input.registrationDetails as any)?.hooks || [];

      for (let hook of hooks) {
        try {
          await client.deleteRestHook(hook.hookId);
        } catch {
          // Hook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.event;
      let parties = data.payload || [];

      return {
        inputs: [
          {
            eventType,
            parties
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let parties = ctx.input.parties || [];
      let eventAction = ctx.input.eventType.split('/')[1] || 'unknown';

      if (parties.length === 0) {
        return {
          type: `party.${eventAction}`,
          id: `${ctx.input.eventType}-${Date.now()}`,
          output: {
            partyId: 0
          }
        };
      }

      let p = parties[0];

      return {
        type: `party.${eventAction}`,
        id: `${ctx.input.eventType}-${p.id}-${p.updatedAt || p.createdAt || Date.now()}`,
        output: {
          partyId: p.id,
          type: p.type,
          firstName: p.firstName,
          lastName: p.lastName,
          name: p.name,
          jobTitle: p.jobTitle,
          about: p.about,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          emailAddresses: p.emailAddresses,
          phoneNumbers: p.phoneNumbers,
          addresses: p.addresses,
          websites: p.websites,
          owner: p.owner,
          team: p.team
        }
      };
    }
  })
  .build();
