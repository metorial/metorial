import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getClient = SlateTool.create(spec, {
  name: 'Get Client',
  key: 'get_client',
  description: `Retrieve detailed information about a specific client by their ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      clientId: z.string().describe('The ID of the client to retrieve')
    })
  )
  .output(
    z.object({
      raw: z.record(z.string(), z.unknown()).optional(),
      clientId: z.string(),
      email: z.string(),
      name: z.string(),
      surname: z.string(),
      fullName: z.string(),
      currency: z.string(),
      business: z.string(),
      locale: z.string(),
      pdfPageSize: z.string(),
      web: z.string().optional(),
      telephone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      postcode: z.string().optional(),
      country: z.string().optional(),
      state: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let result = await client.getClient(ctx.input.clientId);

    return {
      output: result,
      message: `Retrieved client **${result.fullName || result.email}** (ID: ${result.clientId}).`
    };
  })
  .build();
