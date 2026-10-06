import { SlateTool } from 'slates';
import { z } from 'zod';
import { scopeInput } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

let clientSchema = z.object({
  clientId: z.number().describe('Unique client ID'),
  firstName: z.string().nullable().optional().describe('First name'),
  lastName: z.string().nullable().optional().describe('Last name'),
  organization: z.string().nullable().optional().describe('Organization/company name'),
  email: z.string().nullable().optional().describe('Primary email address'),
  phone: z.string().nullable().optional().describe('Phone number (work)'),
  mobilePhone: z.string().nullable().optional().describe('Mobile phone number'),
  currencyCode: z
    .string()
    .nullable()
    .optional()
    .describe('Preferred currency code (e.g. USD, CAD)'),
  language: z.string().nullable().optional().describe('Communication language (e.g. en)'),
  billingStreet: z.string().nullable().optional().describe('Billing street address'),
  billingCity: z.string().nullable().optional().describe('Billing city'),
  billingProvince: z.string().nullable().optional().describe('Billing state/province'),
  billingPostalCode: z.string().nullable().optional().describe('Billing postal/zip code'),
  billingCountry: z.string().nullable().optional().describe('Billing country')
});

const outputSchema = clientSchema.extend({
  raw: z.record(z.string(), z.unknown()).optional(),
  acknowledged: z.boolean().optional(),
  readbackRequired: z.boolean().optional()
});

export let manageClients = SlateTool.create(spec, {
  name: 'Manage Clients',
  key: 'manage_clients',
  description: `Create, update, or delete client records in FreshBooks. Clients are entities you send invoices to. Use this tool to add new clients, update their contact and billing information, or mark them inactive (retained history).`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      ...scopeInput,
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      clientId: z.number().optional().describe('Client ID (required for update/delete)'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      organization: z.string().optional().describe('Organization/company name'),
      email: z.string().optional().describe('Primary email address'),
      phone: z.string().optional().describe('Phone number (work)'),
      mobilePhone: z.string().optional().describe('Mobile phone number'),
      currencyCode: z.string().optional().describe('Preferred currency code (e.g. USD, CAD)'),
      language: z.string().optional().describe('Communication language (e.g. en)'),
      billingStreet: z.string().optional().describe('Billing street address'),
      billingCity: z.string().optional().describe('Billing city'),
      billingProvince: z.string().optional().describe('Billing state/province'),
      billingPostalCode: z.string().optional().describe('Billing postal/zip code'),
      billingCountry: z.string().optional().describe('Billing country')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => invoke('manage_clients', ctx, outputSchema))
  .build();
