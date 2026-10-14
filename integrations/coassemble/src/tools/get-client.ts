import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getClient = SlateTool.create(spec, {
  name: 'Get Client',
  key: 'get_client',
  description: 'Retrieve a client by its identifier, including its user count and metadata.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      clientIdentifier: z
        .string()
        .describe('Client identifier. Call list_clients to discover clients.')
    })
  )
  .output(
    z.object({
      client: z.record(z.string(), z.any()).describe('The client and its available metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let result = await client.getClient(ctx.input.clientIdentifier);

    return {
      output: { client: result },
      message: `Retrieved client \`${ctx.input.clientIdentifier}\`.`
    };
  })
  .build();
