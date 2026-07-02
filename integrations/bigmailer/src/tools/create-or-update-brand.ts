import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createOrUpdateBrand = SlateTool.create(spec, {
  name: 'Create or Update Brand',
  key: 'create_or_update_brand',
  description: `Create a new brand or update an existing one. To update, provide the \`brandId\`. To create, omit \`brandId\` and provide at least a \`name\`. Brands are subaccounts with their own lists, contacts, campaigns, and senders.`,
  instructions: [
    'Omit brandId to create a new brand. Provide brandId to update an existing one.',
    'When updating, only provided fields are changed; others remain unchanged.'
  ]
})
  .input(
    z.object({
      brandId: z
        .string()
        .optional()
        .describe('ID of the brand to update. Omit to create a new brand.'),
      name: z.string().optional().describe('Brand name (1-50 chars)'),
      fromName: z.string().optional().describe('Default sender name for campaigns'),
      fromEmail: z.string().optional().describe('Default sender email address'),
      bounceDangerPercent: z
        .number()
        .min(1)
        .max(15)
        .optional()
        .describe('Bounce percentage threshold to auto-pause campaigns (1-15)'),
      maxSoftBounces: z
        .number()
        .min(0)
        .max(20)
        .optional()
        .describe('Max soft bounces before marking undeliverable (0-20)'),
      websiteUrl: z.string().optional().describe('URL of website associated with the brand'),
      unsubscribeText: z
        .string()
        .optional()
        .describe('Message displayed on the unsubscribe page'),
      contactLimit: z.number().optional().describe('Maximum number of contacts allowed'),
      connectionId: z.string().optional().describe('ID of the email connection service')
    })
  )
  .output(
    z.object({
      brandId: z.string().describe('Brand unique identifier'),
      name: z.string().describe('Brand name'),
      fromName: z.string().describe('Default sender name'),
      fromEmail: z.string().describe('Default sender email'),
      filterSoftBounces: z.boolean().describe('Whether soft-bounced contacts are filtered'),
      maxSoftBounces: z.number().describe('Max soft bounces threshold'),
      bounceDangerPercent: z.number().describe('Auto-pause bounce threshold'),
      unsubscribeText: z.string().describe('Unsubscribe page message'),
      connectionId: z.string().describe('Email connection service ID'),
      contactLimit: z.number().describe('Maximum contacts allowed'),
      url: z.string().describe('Associated website URL'),
      createdAt: z.string().describe('Creation timestamp (ISO 8601)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let payload: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) payload.name = ctx.input.name;
    if (ctx.input.fromName !== undefined) payload.from_name = ctx.input.fromName;
    if (ctx.input.fromEmail !== undefined) payload.from_email = ctx.input.fromEmail;
    if (ctx.input.bounceDangerPercent !== undefined)
      payload.bounce_danger_percent = ctx.input.bounceDangerPercent;
    if (ctx.input.maxSoftBounces !== undefined)
      payload.max_soft_bounces = ctx.input.maxSoftBounces;
    if (ctx.input.websiteUrl !== undefined) payload.url = ctx.input.websiteUrl;
    if (ctx.input.unsubscribeText !== undefined)
      payload.unsubscribe_text = ctx.input.unsubscribeText;
    if (ctx.input.contactLimit !== undefined) payload.contact_limit = ctx.input.contactLimit;
    if (ctx.input.connectionId !== undefined) payload.connection_id = ctx.input.connectionId;

    let isUpdate = !!ctx.input.brandId;
    let b = isUpdate
      ? await client.updateBrand(ctx.input.brandId!, payload)
      : await client.createBrand(payload as { name: string });

    return {
      output: {
        brandId: b.id,
        name: b.name,
        fromName: b.from_name,
        fromEmail: b.from_email,
        filterSoftBounces: b.filter_soft_bounces,
        maxSoftBounces: b.max_soft_bounces,
        bounceDangerPercent: b.bounce_danger_percent,
        unsubscribeText: b.unsubscribe_text,
        connectionId: b.connection_id,
        contactLimit: b.contact_limit,
        url: b.url,
        createdAt: new Date(b.created * 1000).toISOString()
      },
      message: isUpdate
        ? `Updated brand **${b.name}** (${b.id}).`
        : `Created brand **${b.name}** (${b.id}).`
    };
  })
  .build();
