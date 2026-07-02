import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newClientTrigger = SlateTrigger.create(spec, {
  name: 'New or Updated Client',
  key: 'new_or_updated_client',
  description:
    'Triggers when a client is created or updated in Clientary. Polls for clients updated since the last check.'
})
  .input(
    z.object({
      clientId: z.number().describe('ID of the client'),
      name: z.string().describe('Client name'),
      number: z.string().optional().describe('Client number'),
      status: z.number().optional().describe('Client status'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .output(
    z.object({
      clientId: z.number().describe('ID of the client'),
      name: z.string().describe('Client name'),
      number: z.string().optional().describe('Unique client number'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State or province'),
      zip: z.string().optional().describe('Postal/ZIP code'),
      country: z.string().optional().describe('Country'),
      website: z.string().optional().describe('Website URL'),
      description: z.string().optional().describe('Description'),
      status: z.number().optional().describe('Status: 1 = Active, 2 = Archived'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

      let lastPolled = ctx.state?.lastPolled as string | undefined;

      let result = await client.listClients({
        updatedSince: lastPolled
      });

      let clients = result.clients || [];

      let inputs = clients.map((c: any) => ({
        clientId: c.id,
        name: c.name,
        number: c.number,
        status: c.status,
        updatedAt: c.updated_at
      }));

      let now = new Date().toISOString().split('T')[0];

      return {
        inputs,
        updatedState: {
          lastPolled: now
        }
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

      let result = await client.getClient(ctx.input.clientId);
      let c = result.client || result;

      return {
        type: 'client.updated',
        id: `client-${c.id}-${ctx.input.updatedAt || c.id}`,
        output: {
          clientId: c.id,
          name: c.name,
          number: c.number,
          address: c.address,
          city: c.city,
          state: c.state,
          zip: c.zip,
          country: c.country,
          website: c.website,
          description: c.description,
          status: c.status,
          updatedAt: c.updated_at
        }
      };
    }
  })
  .build();
