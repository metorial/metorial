import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z
  .object({
    city: z.string().optional(),
    country: z.string().optional(),
    stateRegion: z.string().optional().describe('State or region'),
    street: z.string().optional(),
    zip: z.string().optional()
  })
  .optional();

export let createAccount = SlateTool.create(spec, {
  name: 'Create Account',
  key: 'create_account',
  description: `Create a new account (company) in Salesflare. You can set name, domain, website, description, addresses, phone numbers, tags, and custom fields. Optionally update an existing account if one with the same domain already exists.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Company/account name'),
      domain: z.string().optional().describe('Company domain (e.g. "example.com")'),
      website: z.string().optional().describe('Company website URL'),
      description: z.string().optional().describe('Account description'),
      owner: z.number().optional().describe('User ID of the account owner'),
      size: z.number().optional().describe('Company size (number of employees)'),
      address: addressSchema.describe('Primary address'),
      email: z.string().optional().describe('Primary email address'),
      phoneNumber: z.string().optional().describe('Primary phone number'),
      socialProfiles: z.array(z.string()).optional().describe('Social profile URLs'),
      tags: z.array(z.string()).optional().describe('Tag names to assign'),
      custom: z.record(z.string(), z.any()).optional().describe('Custom field values'),
      updateIfExists: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, updates an existing account with the same domain')
    })
  )
  .output(
    z.object({
      accountId: z.number().describe('ID of the created/updated account'),
      account: z.record(z.string(), z.any()).describe('Created account data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let data: Record<string, any> = {};
    if (ctx.input.name) data.name = ctx.input.name;
    if (ctx.input.domain) data.domain = ctx.input.domain;
    if (ctx.input.website) data.website = ctx.input.website;
    if (ctx.input.description) data.description = ctx.input.description;
    if (ctx.input.owner) data.owner = ctx.input.owner;
    if (ctx.input.size) data.size = ctx.input.size;
    if (ctx.input.email) data.email = ctx.input.email;
    if (ctx.input.phoneNumber) data.phone_number = ctx.input.phoneNumber;
    if (ctx.input.socialProfiles) data.social_profiles = ctx.input.socialProfiles;
    if (ctx.input.tags) data.tags = ctx.input.tags;
    if (ctx.input.custom) data.custom = ctx.input.custom;
    if (ctx.input.address) {
      data.address = {
        city: ctx.input.address.city,
        country: ctx.input.address.country,
        state_region: ctx.input.address.stateRegion,
        street: ctx.input.address.street,
        zip: ctx.input.address.zip
      };
    }

    let result = await client.createAccount(data, ctx.input.updateIfExists);
    let accountId = result.id ?? result.accountId ?? 0;

    return {
      output: {
        accountId,
        account: result
      },
      message: `Created account **${ctx.input.name || ctx.input.domain || accountId}** (ID: ${accountId}).`
    };
  })
  .build();
