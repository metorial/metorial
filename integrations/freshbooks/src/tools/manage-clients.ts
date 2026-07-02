import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshBooksClient } from '../lib/client';
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

export let manageClients = SlateTool.create(spec, {
  name: 'Manage Clients',
  key: 'manage_clients',
  description: `Create, update, or delete client records in FreshBooks. Clients are entities you send invoices to. Use this tool to add new clients, update their contact and billing information, or archive them.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
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
  .output(clientSchema)
  .handleInvocation(async ctx => {
    let client = new FreshBooksClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      businessId: ctx.config.businessId
    });

    let buildPayload = () => {
      let payload: Record<string, any> = {};
      if (ctx.input.firstName !== undefined) payload.fname = ctx.input.firstName;
      if (ctx.input.lastName !== undefined) payload.lname = ctx.input.lastName;
      if (ctx.input.organization !== undefined) payload.organization = ctx.input.organization;
      if (ctx.input.email !== undefined) payload.email = ctx.input.email;
      if (ctx.input.phone !== undefined) payload.p_phone = ctx.input.phone;
      if (ctx.input.mobilePhone !== undefined) payload.mob_phone = ctx.input.mobilePhone;
      if (ctx.input.currencyCode !== undefined) payload.currency_code = ctx.input.currencyCode;
      if (ctx.input.language !== undefined) payload.language = ctx.input.language;
      if (ctx.input.billingStreet !== undefined) payload.p_street = ctx.input.billingStreet;
      if (ctx.input.billingCity !== undefined) payload.p_city = ctx.input.billingCity;
      if (ctx.input.billingProvince !== undefined)
        payload.p_province = ctx.input.billingProvince;
      if (ctx.input.billingPostalCode !== undefined)
        payload.p_code = ctx.input.billingPostalCode;
      if (ctx.input.billingCountry !== undefined) payload.p_country = ctx.input.billingCountry;
      return payload;
    };

    let mapResult = (raw: any) => ({
      clientId: raw.id,
      firstName: raw.fname,
      lastName: raw.lname,
      organization: raw.organization,
      email: raw.email,
      phone: raw.p_phone,
      mobilePhone: raw.mob_phone,
      currencyCode: raw.currency_code,
      language: raw.language,
      billingStreet: raw.p_street,
      billingCity: raw.p_city,
      billingProvince: raw.p_province,
      billingPostalCode: raw.p_code,
      billingCountry: raw.p_country
    });

    if (ctx.input.action === 'create') {
      let result = await client.createClient(buildPayload());
      return {
        output: mapResult(result),
        message: `Created client **${result.fname || ''} ${result.lname || ''}** (ID: ${result.id})${result.organization ? ` at ${result.organization}` : ''}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.clientId) throw new Error('clientId is required for update action');
      let result = await client.updateClient(ctx.input.clientId, buildPayload());
      return {
        output: mapResult(result),
        message: `Updated client **${result.fname || ''} ${result.lname || ''}** (ID: ${result.id}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.clientId) throw new Error('clientId is required for delete action');
      let result = await client.deleteClient(ctx.input.clientId);
      return {
        output: mapResult(result),
        message: `Archived client (ID: ${ctx.input.clientId}).`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
