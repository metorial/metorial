import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updatePolicy = SlateTool.create(spec, {
  name: 'Update Policy',
  key: 'update_policy',
  description: `Update an insurance policy in AgencyZoom. Supports updating policy details, changing policy status (active, cancelled, renewed, etc.), updating tags, or creating an endorsement with a premium change.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      policyId: z.string().describe('ID of the policy to update'),
      action: z
        .enum(['update', 'change_status', 'update_tags', 'add_endorsement'])
        .describe('Action to perform on the policy'),
      carrier: z.string().optional().describe('New carrier name or ID (for "update" action)'),
      productLine: z
        .string()
        .optional()
        .describe('New product line name or ID (for "update" action)'),
      premium: z
        .number()
        .optional()
        .describe('New premium amount in cents (for "update" action)'),
      effectiveDate: z
        .string()
        .optional()
        .describe('New effective date (for "update" action, ISO date string)'),
      expiryDate: z
        .string()
        .optional()
        .describe('New expiry date (for "update" action, ISO date string)'),
      agentId: z.string().optional().describe('New agent ID (for "update" action)'),
      csrId: z.string().optional().describe('New CSR ID (for "update" action)'),
      status: z
        .enum(['active', 'cancelled', 'renewed', 'reinstated', 'rewritten'])
        .optional()
        .describe('New policy status (for "change_status" action)'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Array of tags to set on the policy (for "update_tags" action)'),
      endorsementPremiumChange: z
        .number()
        .optional()
        .describe(
          'Premium change amount in cents for the endorsement (for "add_endorsement" action)'
        )
    })
  )
  .output(
    z.object({
      policy: z.record(z.string(), z.any()).optional().describe('Updated policy data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    switch (ctx.input.action) {
      case 'update': {
        let data: Record<string, any> = {};
        if (ctx.input.carrier !== undefined) data.carrier = ctx.input.carrier;
        if (ctx.input.productLine !== undefined) data.productLine = ctx.input.productLine;
        if (ctx.input.premium !== undefined) data.premium = ctx.input.premium;
        if (ctx.input.effectiveDate !== undefined)
          data.effectiveDate = ctx.input.effectiveDate;
        if (ctx.input.expiryDate !== undefined) data.expiryDate = ctx.input.expiryDate;
        if (ctx.input.agentId !== undefined) data.agentId = ctx.input.agentId;
        if (ctx.input.csrId !== undefined) data.csrId = ctx.input.csrId;

        let result = await client.updatePolicy(ctx.input.policyId, data);
        return {
          output: { policy: result },
          message: `Updated policy **${ctx.input.policyId}**.`
        };
      }
      case 'change_status': {
        if (!ctx.input.status) {
          throw new Error('status is required for "change_status" action');
        }
        let result = await client.updatePolicyStatus(ctx.input.policyId, {
          status: ctx.input.status
        });
        return {
          output: { policy: result },
          message: `Changed policy **${ctx.input.policyId}** status to **${ctx.input.status}**.`
        };
      }
      case 'update_tags': {
        if (!ctx.input.tags) {
          throw new Error('tags is required for "update_tags" action');
        }
        let result = await client.updatePolicyTags(ctx.input.policyId, {
          tags: ctx.input.tags
        });
        return {
          output: { policy: result },
          message: `Updated tags on policy **${ctx.input.policyId}** (${ctx.input.tags.length} tag(s)).`
        };
      }
      case 'add_endorsement': {
        let endorsementData: Record<string, any> = {};
        if (ctx.input.endorsementPremiumChange !== undefined) {
          endorsementData.premiumChange = ctx.input.endorsementPremiumChange;
        }
        let result = await client.createPolicyEndorsement(ctx.input.policyId, endorsementData);
        return {
          output: { policy: result },
          message: `Added endorsement to policy **${ctx.input.policyId}**.`
        };
      }
    }
  })
  .build();
