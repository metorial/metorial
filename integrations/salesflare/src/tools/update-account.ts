import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { associationChanges, Client, id, object, type Row } from '../lib/client';
import { spec } from '../spec';

export let updateAccount = SlateTool.create(spec, {
  name: 'Update Account',
  key: 'update_account',
  description: `Update an existing account in Salesflare. Modify name, domain, website, description, address, phone numbers, tags, custom fields, and manage associated contacts and users.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      accountId: z.number().describe('ID of the account to update'),
      name: z.string().optional().describe('Updated company name'),
      domain: z.string().optional().describe('Updated domain'),
      website: z.string().optional().describe('Updated website URL'),
      description: z.string().optional().describe('Updated description'),
      owner: z.number().optional().describe('User ID of the new owner'),
      size: z.number().optional().describe('Updated company size'),
      email: z.string().optional().describe('Updated primary email'),
      phoneNumber: z.string().optional().describe('Updated primary phone number'),
      socialProfiles: z.array(z.string()).optional().describe('Updated social profile URLs'),
      tags: z.array(z.string()).optional().describe('Updated tag names'),
      custom: z.record(z.string(), z.any()).optional().describe('Updated custom field values'),
      address: z
        .object({
          city: z.string().optional(),
          country: z.string().optional(),
          stateRegion: z.string().optional(),
          street: z.string().optional(),
          zip: z.string().optional()
        })
        .optional()
        .describe('Updated primary address'),
      contactIds: z
        .array(z.number())
        .optional()
        .describe('Contact IDs to associate with this account'),
      removeContactIds: z
        .array(z.number())
        .optional()
        .describe('Contact IDs to remove from this account'),
      userIds: z
        .array(z.number())
        .optional()
        .describe('User IDs to associate with this account'),
      removeUserIds: z
        .array(z.number())
        .optional()
        .describe('User IDs to remove from this account')
    })
  )
  .output(
    z.object({
      account: z.record(z.string(), z.any()).describe('Updated account data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let data: Row = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.domain !== undefined) data.domain = ctx.input.domain;
    if (ctx.input.website !== undefined) data.website = ctx.input.website;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.owner !== undefined) data.owner = ctx.input.owner;
    if (ctx.input.size !== undefined) data.size = ctx.input.size;
    if (ctx.input.email !== undefined) data.email = ctx.input.email;
    if (ctx.input.phoneNumber !== undefined) data.phone_number = ctx.input.phoneNumber;
    if (ctx.input.socialProfiles !== undefined)
      data.social_profiles = ctx.input.socialProfiles;
    if (ctx.input.tags !== undefined) data.tags = ctx.input.tags;
    if (ctx.input.custom !== undefined) data.custom = ctx.input.custom;
    if (ctx.input.address) {
      data.address = {
        city: ctx.input.address.city,
        country: ctx.input.address.country,
        state_region: ctx.input.address.stateRegion,
        street: ctx.input.address.street,
        zip: ctx.input.address.zip
      };
    }

    id(ctx.input.accountId, 'account ID');
    const contacts = associationChanges(
      ctx.input.contactIds,
      ctx.input.removeContactIds,
      'contact IDs'
    );
    const users = associationChanges(ctx.input.userIds, ctx.input.removeUserIds, 'user IDs');
    if (!Object.keys(data).length && !contacts.length && !users.length)
      throw createApiServiceError('Provide at least one account or association change.');
    if (Object.keys(data).length) await client.updateAccount(ctx.input.accountId, data);
    if (contacts.length) await client.updateAccountContacts(ctx.input.accountId, contacts);
    if (users.length) await client.updateAccountUsers(ctx.input.accountId, users);
    const result = await client.getAccount(ctx.input.accountId);
    for (const [kind, changes] of [
      ['contacts', contacts],
      ['users', users]
    ] as const) {
      if (!changes.length) continue;
      const rows = result[kind];
      if (!Array.isArray(rows))
        throw createApiServiceError(
          'The account update was accepted, but association readback is unavailable. Inspect the account before retrying.'
        );
      const ids = rows.map(row => (typeof row === 'number' ? id(row) : id(object(row).id)));
      if (
        changes.some(change =>
          '_dirty' in change ? !ids.includes(change.id) : ids.includes(change.id)
        )
      )
        throw createApiServiceError(
          'Association readback did not confirm all changes. Earlier changes may have applied; inspect the account before retrying.'
        );
    }

    return {
      output: { account: result },
      message: `Updated account **${ctx.input.accountId}**.`
    };
  })
  .build();
