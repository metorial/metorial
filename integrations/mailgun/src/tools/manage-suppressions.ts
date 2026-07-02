import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailgunClient } from '../lib/client';
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
      await client.addBounce(domain, { address, code, error });
    } else if (type === 'complaint') {
      await client.addComplaint(domain, { address });
    } else {
      await client.addUnsubscribe(domain, { address, tag });
    }

    return {
      output: { success: true },
      message: `Added **${address}** to the ${type} suppression list for **${domain}**.`
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
