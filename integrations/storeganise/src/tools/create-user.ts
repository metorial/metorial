import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createUserTool = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create a new tenant/customer account in Storeganise. Provide basic contact information to set up the account. Additional custom fields can be passed as needed.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address for the new user'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      phone: z.string().optional().describe('Phone number'),
      company: z.string().optional().describe('Company name'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      region: z.string().optional().describe('State or region'),
      postcode: z.string().optional().describe('Postal/ZIP code'),
      country: z.string().optional().describe('Country code (e.g. US, GB)'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values as key-value pairs')
    })
  )
  .output(
    z.object({
      user: z.record(z.string(), z.any()).describe('The created user account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let userData: Record<string, any> = {
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName
    };

    if (ctx.input.phone) userData.phone = ctx.input.phone;
    if (ctx.input.company) userData.company = ctx.input.company;
    if (ctx.input.address) userData.address = ctx.input.address;
    if (ctx.input.city) userData.city = ctx.input.city;
    if (ctx.input.region) userData.region = ctx.input.region;
    if (ctx.input.postcode) userData.postcode = ctx.input.postcode;
    if (ctx.input.country) userData.country = ctx.input.country;
    if (ctx.input.customFields) userData.customFields = ctx.input.customFields;

    let user = await client.createUser(userData);

    return {
      output: { user },
      message: `Created user **${ctx.input.firstName} ${ctx.input.lastName}** (${ctx.input.email}).`
    };
  })
  .build();
