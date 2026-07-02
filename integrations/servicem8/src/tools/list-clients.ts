import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let clientSchema = z.object({
  companyUuid: z.string().describe('Unique identifier for the client/company'),
  name: z.string().optional().describe('Company name'),
  addressStreet: z.string().optional().describe('Street address'),
  addressCity: z.string().optional().describe('City'),
  addressState: z.string().optional().describe('State/province'),
  addressPostcode: z.string().optional().describe('Postal/zip code'),
  addressCountry: z.string().optional().describe('Country'),
  website: z.string().optional().describe('Company website URL'),
  isIndividual: z
    .string()
    .optional()
    .describe('Whether this is an individual rather than a company'),
  faxNumber: z.string().optional().describe('Fax number'),
  billingAttention: z.string().optional().describe('Billing attention line'),
  paymentTerms: z.string().optional().describe('Payment terms'),
  active: z.number().optional().describe('1 = active, 0 = deleted'),
  editDate: z.string().optional().describe('Timestamp when the record was last modified')
});

export let listClients = SlateTool.create(spec, {
  name: 'List Clients',
  key: 'list_clients',
  description: `List and filter clients (companies) from ServiceM8. Supports OData-style filtering on fields like **name**, **active**, **address_city**, etc. Returns all matching client records.`,
  instructions: [
    'Use the filter parameter with OData syntax, e.g. "active eq 1"',
    'Clients are called "Company" in the ServiceM8 API'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .string()
        .optional()
        .describe('OData-style filter expression, e.g. "active eq 1"')
    })
  )
  .output(
    z.object({
      clients: z.array(clientSchema).describe('List of matching clients')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let companies = await client.listCompanies({ filter: ctx.input.filter });

    let mapped = companies.map((c: any) => ({
      companyUuid: c.uuid,
      name: c.name,
      addressStreet: c.address_street,
      addressCity: c.address_city,
      addressState: c.address_state,
      addressPostcode: c.address_postcode,
      addressCountry: c.address_country,
      website: c.website,
      isIndividual: c.is_individual,
      faxNumber: c.fax_number,
      billingAttention: c.billing_attention,
      paymentTerms: c.payment_terms,
      active: c.active,
      editDate: c.edit_date
    }));

    return {
      output: { clients: mapped },
      message: `Found **${mapped.length}** client(s)${ctx.input.filter ? ` matching filter: \`${ctx.input.filter}\`` : ''}.`
    };
  })
  .build();
