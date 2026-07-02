import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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

    let data: Record<string, any> = {};
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

    let result = await client.updateAccount(ctx.input.accountId, data);

    // Handle contact associations
    if (ctx.input.contactIds || ctx.input.removeContactIds) {
      let contactUpdates: Array<{ id: number; _dirty?: boolean; _deleted?: boolean }> = [];
      if (ctx.input.contactIds) {
        contactUpdates.push(...ctx.input.contactIds.map(id => ({ id, _dirty: true })));
      }
      if (ctx.input.removeContactIds) {
        contactUpdates.push(...ctx.input.removeContactIds.map(id => ({ id, _deleted: true })));
      }
      if (contactUpdates.length > 0) {
        await client.updateAccountContacts(ctx.input.accountId, contactUpdates);
      }
    }

    // Handle user associations
    if (ctx.input.userIds || ctx.input.removeUserIds) {
      let userUpdates: Array<{ id: number; _dirty?: boolean; _deleted?: boolean }> = [];
      if (ctx.input.userIds) {
        userUpdates.push(...ctx.input.userIds.map(id => ({ id, _dirty: true })));
      }
      if (ctx.input.removeUserIds) {
        userUpdates.push(...ctx.input.removeUserIds.map(id => ({ id, _deleted: true })));
      }
      if (userUpdates.length > 0) {
        await client.updateAccountUsers(ctx.input.accountId, userUpdates);
      }
    }

    return {
      output: { account: result },
      message: `Updated account **${ctx.input.accountId}**.`
    };
  })
  .build();
