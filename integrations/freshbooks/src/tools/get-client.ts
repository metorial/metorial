import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshBooksClient } from '../lib/client';
import { spec } from '../spec';

export let getClient = SlateTool.create(spec, {
  name: 'Get Client',
  key: 'get_client',
  description: `Retrieve detailed information about a specific client by their ID. Returns full contact details, billing address, and preferences.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      clientId: z.number().describe('The client ID to retrieve')
    })
  )
  .output(
    z.object({
      clientId: z.number(),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      organization: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      mobilePhone: z.string().nullable().optional(),
      currencyCode: z.string().nullable().optional(),
      language: z.string().nullable().optional(),
      billingStreet: z.string().nullable().optional(),
      billingCity: z.string().nullable().optional(),
      billingProvince: z.string().nullable().optional(),
      billingPostalCode: z.string().nullable().optional(),
      billingCountry: z.string().nullable().optional(),
      outstandingBalance: z.any().optional().describe('Outstanding balance amount')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshBooksClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      businessId: ctx.config.businessId
    });

    let result = await client.getClient(ctx.input.clientId);

    let output = {
      clientId: result.id,
      firstName: result.fname,
      lastName: result.lname,
      organization: result.organization,
      email: result.email,
      phone: result.p_phone,
      mobilePhone: result.mob_phone,
      currencyCode: result.currency_code,
      language: result.language,
      billingStreet: result.p_street,
      billingCity: result.p_city,
      billingProvince: result.p_province,
      billingPostalCode: result.p_code,
      billingCountry: result.p_country,
      outstandingBalance: result.outstanding_balance
    };

    return {
      output,
      message: `Retrieved client **${result.fname || ''} ${result.lname || ''}** (ID: ${result.id})${result.organization ? ` - ${result.organization}` : ''}.`
    };
  })
  .build();
