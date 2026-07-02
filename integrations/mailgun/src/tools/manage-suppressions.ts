import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailgunClient } from '../lib/client';
import { mailgunServiceError } from '../lib/errors';
import { spec } from '../spec';

// ==================== List Suppressions ====================

export let listSuppressions = SlateTool.create(spec, {
  name: 'List Suppressions',
  key: 'list_suppressions',
  description: `List suppressed email addresses for a domain. Retrieves bounces, complaints, or unsubscribes depending on the type selected.
Suppressed addresses are blocked from receiving further emails to protect sending reputation.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name to query suppressions for'),
      type: z
        .enum(['bounces', 'complaints', 'unsubscribes'])
        .describe('Type of suppression to list'),
      limit: z.number().optional().describe('Maximum number of records to return'),
      skip: z.number().optional().describe('Number of records to skip for pagination')
    })
  )
  .output(
    z.object({
      suppressions: z.array(
        z.object({
          address: z.string().describe('Suppressed email address'),
          type: z.string().describe('Suppression type'),
          code: z.string().optional().describe('Bounce error code'),
          error: z.string().optional().describe('Bounce error message'),
          tag: z.string().optional().describe('Unsubscribe tag'),
          createdAt: z.string().optional().describe('When the suppression was recorded')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let { domain, type, limit, skip } = ctx.input;

    let suppressions: Array<{
      address: string;
      type: string;
      code?: string;
      error?: string;
      tag?: string;
      createdAt?: string;
    }> = [];

    if (type === 'bounces') {
      let result = await client.listBounces(domain, { limit, skip });
      suppressions = (result.items || []).map(b => ({
        address: b.address,
        type: 'bounce',
        code: b.code,
        error: b.error,
        createdAt: b.created_at
      }));
    } else if (type === 'complaints') {
      let result = await client.listComplaints(domain, { limit, skip });
      suppressions = (result.items || []).map(c => ({
        address: c.address,
        type: 'complaint',
        createdAt: c.created_at
      }));
    } else {
      let result = await client.listUnsubscribes(domain, { limit, skip });
      suppressions = (result.items || []).map(u => ({
        address: u.address,
        type: 'unsubscribe',
        tag: u.tag,
        createdAt: u.created_at
      }));
    }

    return {
      output: { suppressions },
      message: `Retrieved **${suppressions.length}** ${type} suppression(s) for **${domain}**.`
    };
  })
  .build();

// ==================== Add Suppression ====================

export let addSuppression = SlateTool.create(spec, {
  name: 'Add Suppression',
  key: 'add_suppression',
  description: `Add an email address to a suppression list (bounce, complaint, or unsubscribe). Once suppressed, Mailgun will stop delivering emails to that address for the specified domain.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name'),
      type: z
        .enum(['bounce', 'complaint', 'unsubscribe'])
        .describe('Type of suppression to add'),
      address: z.string().describe('Email address to suppress'),
      code: z.number().optional().describe('Bounce error code (only for bounce type)'),
      error: z.string().optional().describe('Bounce error message (only for bounce type)'),
      tag: z.string().optional().describe('Unsubscribe tag (only for unsubscribe type)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the suppression was added')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let { domain, type, address, code, error, tag } = ctx.input;

    if (type === 'bounce') {
      if (tag) {
        throw mailgunServiceError('tag only applies to unsubscribe suppressions.');
      }
      await client.addBounce(domain, { address, code, error });
    } else if (type === 'complaint') {
      if (code !== undefined || error || tag) {
        throw mailgunServiceError(
          'code, error, and tag do not apply to complaint suppressions.'
        );
      }
      await client.addComplaint(domain, { address });
    } else {
      if (code !== undefined || error) {
        throw mailgunServiceError('code and error only apply to bounce suppressions.');
      }
      await client.addUnsubscribe(domain, { address, tag });
    }

    return {
      output: { success: true },
      message: `Added **${address}** to the ${type} suppression list for **${domain}**.`
    };
  })
  .build();

// ==================== Allowlist ====================

let allowlistEntrySchema = z.object({
  value: z.string().describe('Allowlisted email address or domain'),
  entryType: z.string().optional().describe('Whether the entry is an address or domain'),
  reason: z.string().optional().describe('Reason or note if returned by Mailgun'),
  createdAt: z.string().optional().describe('When the entry was created')
});

export let listAllowlist = SlateTool.create(spec, {
  name: 'List Allowlist',
  key: 'list_allowlist',
  description: `List Mailgun allowlist entries for a domain. Allowlisted addresses or domains are protected from being added to bounce suppressions, which is useful for test and controlled-recipient workflows.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name to query allowlist entries for'),
      limit: z.number().optional().describe('Maximum number of records to return'),
      page: z
        .enum(['next', 'previous', 'last'])
        .optional()
        .describe('Page direction relative to address'),
      address: z.string().optional().describe('Pagination divider address'),
      term: z.string().optional().describe('Filter entries that start with this substring')
    })
  )
  .output(
    z.object({
      entries: z.array(allowlistEntrySchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.listAllowlist(ctx.input.domain, {
      limit: ctx.input.limit,
      page: ctx.input.page,
      address: ctx.input.address,
      term: ctx.input.term
    });

    let entries = (result.items || []).map(entry => {
      return {
        value: entry.value ?? '',
        entryType: entry.type,
        reason: entry.reason,
        createdAt: entry.createdAt
      };
    });

    return {
      output: { entries },
      message: `Retrieved **${entries.length}** allowlist entr${entries.length === 1 ? 'y' : 'ies'} for **${ctx.input.domain}**.`
    };
  })
  .build();

export let addAllowlistEntry = SlateTool.create(spec, {
  name: 'Add Allowlist Entry',
  key: 'add_allowlist_entry',
  description: `Add an email address or domain to Mailgun's allowlist for a domain. Allowlisted values are prevented from being added to the bounce suppression list.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name'),
      entryType: z.enum(['address', 'domain']).describe('Whether value is an email or domain'),
      value: z.string().describe('Email address or domain to allowlist')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the allowlist entry was added')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    await client.addAllowlistEntry(ctx.input.domain, {
      entryType: ctx.input.entryType,
      value: ctx.input.value
    });

    return {
      output: { success: true },
      message: `Added **${ctx.input.value}** to the allowlist for **${ctx.input.domain}**.`
    };
  })
  .build();

export let removeAllowlistEntry = SlateTool.create(spec, {
  name: 'Remove Allowlist Entry',
  key: 'remove_allowlist_entry',
  description: `Remove an email address or domain from Mailgun's allowlist for a domain.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name'),
      value: z.string().describe('Email address or domain to remove from the allowlist')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the allowlist entry was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    await client.deleteAllowlistEntry(ctx.input.domain, ctx.input.value);

    return {
      output: { success: true },
      message: `Removed **${ctx.input.value}** from the allowlist for **${ctx.input.domain}**.`
    };
  })
  .build();

// ==================== Remove Suppression ====================

export let removeSuppression = SlateTool.create(spec, {
  name: 'Remove Suppression',
  key: 'remove_suppression',
  description: `Remove an email address from a suppression list (bounce, complaint, or unsubscribe). This re-enables delivery to the address.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name'),
      type: z
        .enum(['bounce', 'complaint', 'unsubscribe'])
        .describe('Type of suppression to remove'),
      address: z.string().describe('Email address to remove from the suppression list')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the suppression was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let { domain, type, address } = ctx.input;

    if (type === 'bounce') {
      await client.deleteBounce(domain, address);
    } else if (type === 'complaint') {
      await client.deleteComplaint(domain, address);
    } else {
      await client.deleteUnsubscribe(domain, address);
    }

    return {
      output: { success: true },
      message: `Removed **${address}** from the ${type} suppression list for **${domain}**.`
    };
  })
  .build();
