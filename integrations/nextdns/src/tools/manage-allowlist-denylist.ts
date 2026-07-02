import { SlateTool } from 'slates';
import { z } from 'zod';
import { NextDnsClient } from '../lib/client';
import { spec } from '../spec';

let listEntrySchema = z.object({
  domain: z.string().describe('Domain name (e.g., "example.com")'),
  active: z.boolean().describe('Whether the entry is active')
});

export let manageAllowlistDenylist = SlateTool.create(spec, {
  name: 'Manage Allow & Deny Lists',
  key: 'manage_allowlist_denylist',
  description: `Add, remove, or toggle domains on a NextDNS profile's allowlist or denylist. Retrieve the current lists, add new domains, remove existing domains, or toggle entries active/inactive. Operate on the allowlist, denylist, or both in a single call.`,
  instructions: [
    'To view current lists, omit the add/remove/toggle fields.',
    'Entries can be toggled active/inactive without removing them.'
  ]
})
  .input(
    z.object({
      profileId: z.string().describe('ID of the profile'),
      allowlistDomainsToAdd: z
        .array(z.string())
        .optional()
        .describe('Domains to add to the allowlist'),
      allowlistDomainsToRemove: z
        .array(z.string())
        .optional()
        .describe('Domains to remove from the allowlist'),
      allowlistDomainsToToggle: z
        .array(
          z.object({
            domain: z.string().describe('Domain name'),
            active: z.boolean().describe('New active state')
          })
        )
        .optional()
        .describe('Allowlist entries to toggle active/inactive'),
      denylistDomainsToAdd: z
        .array(z.string())
        .optional()
        .describe('Domains to add to the denylist'),
      denylistDomainsToRemove: z
        .array(z.string())
        .optional()
        .describe('Domains to remove from the denylist'),
      denylistDomainsToToggle: z
        .array(
          z.object({
            domain: z.string().describe('Domain name'),
            active: z.boolean().describe('New active state')
          })
        )
        .optional()
        .describe('Denylist entries to toggle active/inactive')
    })
  )
  .output(
    z.object({
      allowlist: z.array(listEntrySchema).describe('Current allowlist entries'),
      denylist: z.array(listEntrySchema).describe('Current denylist entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NextDnsClient({ token: ctx.auth.token });
    let { profileId } = ctx.input;

    // Allowlist operations
    if (ctx.input.allowlistDomainsToAdd) {
      for (let domain of ctx.input.allowlistDomainsToAdd) {
        await client.addToAllowlist(profileId, domain);
      }
    }
    if (ctx.input.allowlistDomainsToRemove) {
      for (let domain of ctx.input.allowlistDomainsToRemove) {
        await client.removeFromAllowlist(profileId, domain);
      }
    }
    if (ctx.input.allowlistDomainsToToggle) {
      for (let entry of ctx.input.allowlistDomainsToToggle) {
        await client.updateAllowlistEntry(profileId, entry.domain, entry.active);
      }
    }

    // Denylist operations
    if (ctx.input.denylistDomainsToAdd) {
      for (let domain of ctx.input.denylistDomainsToAdd) {
        await client.addToDenylist(profileId, domain);
      }
    }
    if (ctx.input.denylistDomainsToRemove) {
      for (let domain of ctx.input.denylistDomainsToRemove) {
        await client.removeFromDenylist(profileId, domain);
      }
    }
    if (ctx.input.denylistDomainsToToggle) {
      for (let entry of ctx.input.denylistDomainsToToggle) {
        await client.updateDenylistEntry(profileId, entry.domain, entry.active);
      }
    }

    let allowlistResult = await client.getAllowlist(profileId);
    let denylistResult = await client.getDenylist(profileId);

    let allowlist = (allowlistResult.data || []).map((e: any) => ({
      domain: e.id,
      active: e.active
    }));
    let denylist = (denylistResult.data || []).map((e: any) => ({
      domain: e.id,
      active: e.active
    }));

    return {
      output: { allowlist, denylist },
      message: `Allowlist: **${allowlist.length}** entries. Denylist: **${denylist.length}** entries.`
    };
  })
  .build();
