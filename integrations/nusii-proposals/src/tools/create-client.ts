import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createClient = SlateTool.create(spec, {
  name: 'Create Client',
  key: 'create_client',
  description: `Create a new client in Nusii with contact details, preferred currency, locale, and address information.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Client email address (required)'),
      name: z.string().optional().describe('Client first name'),
      surname: z.string().optional().describe('Client surname/last name'),
      currency: z.string().optional().describe('Preferred currency code (e.g. USD, EUR, GBP)'),
      business: z.string().optional().describe('Business/company name'),
      locale: z.string().optional().describe('Preferred locale/language (e.g. en, es, de)'),
      pdfPageSize: z
        .string()
        .optional()
        .describe('PDF page size preference (e.g. A4, Letter)'),
      web: z.string().optional().describe('Website URL'),
      telephone: z.string().optional().describe('Phone number'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      postcode: z.string().optional().describe('Postal/ZIP code'),
      country: z.string().optional().describe('Country'),
      state: z.string().optional().describe('State/province/region')
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
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createClient(ctx.input);

    return {
      output: result,
      message: `Created client **${result.fullName || result.email}** (ID: ${result.clientId}).`
    };
  })
  .build();
