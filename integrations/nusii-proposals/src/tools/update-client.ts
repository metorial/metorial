import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateClient = SlateTool.create(spec, {
  name: 'Update Client',
  key: 'update_client',
  description: `Update an existing client's information. Only provided fields will be updated; omitted fields remain unchanged.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      clientId: z.string().describe('The ID of the client to update'),
      email: z.string().optional().describe('Updated email address'),
      name: z.string().optional().describe('Updated first name'),
      surname: z.string().optional().describe('Updated surname/last name'),
      currency: z.string().optional().describe('Updated preferred currency code'),
      business: z.string().optional().describe('Updated business/company name'),
      locale: z.string().optional().describe('Updated locale/language'),
      pdfPageSize: z.string().optional().describe('Updated PDF page size'),
      web: z.string().optional().describe('Updated website URL'),
      telephone: z.string().optional().describe('Updated phone number'),
      address: z.string().optional().describe('Updated street address'),
      city: z.string().optional().describe('Updated city'),
      postcode: z.string().optional().describe('Updated postal/ZIP code'),
      country: z.string().optional().describe('Updated country'),
      state: z.string().optional().describe('Updated state/province/region')
    })
  )
  .output(
    z.object({
      clientId: z.string(),
      email: z.string(),
      name: z.string(),
      surname: z.string(),
      fullName: z.string(),
      currency: z.string(),
      business: z.string(),
      locale: z.string(),
      pdfPageSize: z.string(),
      web: z.string(),
      telephone: z.string(),
      address: z.string(),
      city: z.string(),
      postcode: z.string(),
      country: z.string(),
      state: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let { clientId, ...updateData } = ctx.input;
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateClient(clientId, updateData);

    return {
      output: result,
      message: `Updated client **${result.fullName || result.email}** (ID: ${result.clientId}).`
    };
  })
  .build();
