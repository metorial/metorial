import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageBlacklist = SlateTool.create(spec, {
  name: 'Manage Blacklist',
  key: 'manage_blacklist',
  description: `View, add, or remove email addresses and domains from your blacklist. Blacklisted entries are excluded from outreach sequences to prevent sending to unwanted recipients.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'add', 'remove']).describe('Action to perform on the blacklist'),
      filterType: z
        .enum(['domain', 'email'])
        .optional()
        .describe('Filter by type when listing'),
      domains: z
        .array(z.string())
        .optional()
        .describe('Domain names to add or remove (e.g. ["spam.com", "blocked.org"])'),
      emails: z.array(z.string()).optional().describe('Email addresses to add or remove')
    })
  )
  .output(
    z.object({
      blacklist: z
        .record(z.string(), z.any())
        .optional()
        .describe('Current blacklist entries'),
      added: z.boolean().optional().describe('Whether items were added'),
      removed: z.boolean().optional().describe('Whether items were removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, filterType, domains, emails } = ctx.input;

    if (action === 'list') {
      let blacklist = await client.listBlacklist(filterType);
      return {
        output: { blacklist },
        message: `Retrieved blacklist entries.`
      };
    }

    if (action === 'add') {
      let data: { domains?: string[]; emails?: string[] } = {};
      if (domains) data.domains = domains;
      if (emails) data.emails = emails;
      await client.addToBlacklist(data);
      return {
        output: { added: true },
        message: `Added **${(domains?.length ?? 0) + (emails?.length ?? 0)}** item(s) to the blacklist.`
      };
    }

    // remove
    let data: { domains?: string[]; emails?: string[] } = {};
    if (domains) data.domains = domains;
    if (emails) data.emails = emails;
    await client.removeFromBlacklist(data);
    return {
      output: { removed: true },
      message: `Removed **${(domains?.length ?? 0) + (emails?.length ?? 0)}** item(s) from the blacklist.`
    };
  })
  .build();
