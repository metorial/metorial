import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageBlacklist = SlateTool.create(spec, {
  name: 'Manage Blacklist',
  key: 'manage_blacklist',
  description: `Add or remove email addresses and domains from the Woodpecker blacklist. Blacklisted contacts and domains will be excluded from all outreach campaigns.
- Use **add** action to blacklist new emails or domains
- Use **remove** action to remove entries from the blacklist`
})
  .input(
    z.object({
      action: z
        .enum(['add', 'remove'])
        .describe('Whether to add or remove entries from the blacklist'),
      emails: z
        .array(z.string())
        .optional()
        .describe('Email addresses to add/remove from the blacklist'),
      domains: z
        .array(z.string())
        .optional()
        .describe('Domains to add/remove from the blacklist (e.g., "example.com")')
    })
  )
  .output(
    z.object({
      processed: z.boolean().describe('Whether the operation was successful'),
      emailCount: z.number().describe('Number of emails processed'),
      domainCount: z.number().describe('Number of domains processed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let emailCount = 0;
    let domainCount = 0;

    if (ctx.input.emails && ctx.input.emails.length > 0) {
      if (ctx.input.action === 'add') {
        await client.addBlacklistEmails(ctx.input.emails);
      } else {
        await client.deleteBlacklistEmails(ctx.input.emails);
      }
      emailCount = ctx.input.emails.length;
    }

    if (ctx.input.domains && ctx.input.domains.length > 0) {
      if (ctx.input.action === 'add') {
        await client.addBlacklistDomains(ctx.input.domains);
      } else {
        await client.deleteBlacklistDomains(ctx.input.domains);
      }
      domainCount = ctx.input.domains.length;
    }

    let actionVerb = ctx.input.action === 'add' ? 'Added' : 'Removed';
    let parts: string[] = [];
    if (emailCount > 0) parts.push(`${emailCount} email(s)`);
    if (domainCount > 0) parts.push(`${domainCount} domain(s)`);

    return {
      output: { processed: true, emailCount, domainCount },
      message: `${actionVerb} ${parts.join(' and ')} ${ctx.input.action === 'add' ? 'to' : 'from'} the blacklist.`
    };
  })
  .build();
