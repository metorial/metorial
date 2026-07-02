import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createPolicy = SlateTool.create(spec, {
  name: 'Create Policy',
  key: 'create_policy',
  description: `Create a new insurance policy in AgencyZoom. Associate it with a customer, set carrier and product line details, premium amounts, effective/expiry dates, and assign agents or CSRs.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('ID of the customer this policy belongs to'),
      carrier: z.string().describe('Insurance carrier name or ID'),
      productLine: z
        .string()
        .describe('Product line name or ID (e.g. "Auto", "Home", "Life")'),
      premium: z.number().optional().describe('Policy premium amount in cents'),
      items: z.number().optional().describe('Number of items or units covered by the policy'),
      effectiveDate: z
        .string()
        .optional()
        .describe('Policy effective date (ISO date string, e.g. "2024-01-01")'),
      expiryDate: z
        .string()
        .optional()
        .describe('Policy expiry date (ISO date string, e.g. "2025-01-01")'),
      agentId: z.string().optional().describe('ID of the agent assigned to this policy'),
      csrId: z.string().optional().describe('ID of the CSR assigned to this policy'),
      locationId: z.string().optional().describe('ID of the agency location for this policy'),
      category: z.string().optional().describe('Policy category'),
      tags: z.array(z.string()).optional().describe('Array of tags to apply to the policy')
    })
  )
  .output(
    z.object({
      policy: z.record(z.string(), z.any()).describe('The created policy data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let data: Record<string, any> = {
      customerId: ctx.input.customerId,
      carrier: ctx.input.carrier,
      productLine: ctx.input.productLine
    };
    if (ctx.input.premium !== undefined) data.premium = ctx.input.premium;
    if (ctx.input.items !== undefined) data.items = ctx.input.items;
    if (ctx.input.effectiveDate !== undefined) data.effectiveDate = ctx.input.effectiveDate;
    if (ctx.input.expiryDate !== undefined) data.expiryDate = ctx.input.expiryDate;
    if (ctx.input.agentId !== undefined) data.agentId = ctx.input.agentId;
    if (ctx.input.csrId !== undefined) data.csrId = ctx.input.csrId;
    if (ctx.input.locationId !== undefined) data.locationId = ctx.input.locationId;
    if (ctx.input.category !== undefined) data.category = ctx.input.category;
    if (ctx.input.tags !== undefined) data.tags = ctx.input.tags;

    let result = await client.createPolicy(data);

    return {
      output: { policy: result },
      message: `Created policy for customer **${ctx.input.customerId}** with carrier **${ctx.input.carrier}** and product line **${ctx.input.productLine}**.`
    };
  })
  .build();
