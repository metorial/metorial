import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageClient = SlateTool.create(spec, {
  name: 'Create or Update Client',
  key: 'manage_client',
  description: `Create a new client or update an existing client in TimeCamp. To create a new client, provide a name. To update an existing client, also provide the clientId.`,
  instructions: [
    'Omit clientId to create a new client.',
    'Provide clientId to update an existing client.'
  ]
})
  .input(
    z.object({
      clientId: z
        .number()
        .optional()
        .describe('Client ID to update. Omit to create a new client.'),
      name: z.string().describe('Client name'),
      address: z.string().optional().describe('Client address'),
      currencyId: z.number().optional().describe('Currency identifier')
    })
  )
  .output(
    z.object({
      clientId: z.string().describe('ID of the created or updated client')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let isUpdate = ctx.input.clientId !== undefined;

    if (isUpdate) {
      await client.updateClient({
        clientId: ctx.input.clientId!,
        name: ctx.input.name,
        address: ctx.input.address,
        currencyId: ctx.input.currencyId
      });

      return {
        output: {
          clientId: String(ctx.input.clientId)
        },
        message: `Updated client **${ctx.input.clientId}**.`
      };
    } else {
      let result = await client.createClient({
        name: ctx.input.name,
        address: ctx.input.address,
        currencyId: ctx.input.currencyId
      });

      let clientId = String(result?.client_id || '');

      return {
        output: {
          clientId
        },
        message: `Created client **"${ctx.input.name}"** with ID ${clientId}.`
      };
    }
  })
  .build();
