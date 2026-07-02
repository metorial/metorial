import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requirePostmarkNumber, requirePostmarkString } from '../lib/errors';
import { spec } from '../spec';

let inboundRuleOutput = z.object({
  ruleId: z.number().describe('Inbound rule ID.'),
  rule: z.string().describe('Email address or domain blocked by the inbound rule.')
});

export let manageInboundRules = SlateTool.create(spec, {
  name: 'Manage Inbound Rules',
  key: 'manage_inbound_rules',
  description: `List, create, or delete Postmark inbound rule triggers. Inbound rules block specific email addresses or domains from sending to your Postmark inbound address.`,
  instructions: [
    'Set **action** to "list", "create", or "delete".',
    'For "create", provide **rule** as an email address or domain to block.',
    'For "delete", provide **ruleId**.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'delete'])
        .describe('Inbound rule operation to perform.'),
      ruleId: z.number().optional().describe('Inbound rule ID for delete.'),
      rule: z.string().optional().describe('Email address or domain to block for create.'),
      count: z
        .number()
        .min(1)
        .max(500)
        .default(100)
        .describe('Number of rules to return for list.'),
      offset: z.number().min(0).default(0).describe('Offset for list pagination.')
    })
  )
  .output(
    z.object({
      totalCount: z.number().optional().describe('Total inbound rules.'),
      rules: z.array(inboundRuleOutput).optional().describe('Inbound rules.'),
      rule: inboundRuleOutput.optional().describe('Created inbound rule.'),
      deleted: z.boolean().optional().describe('Whether the inbound rule was deleted.'),
      statusMessage: z.string().optional().describe('Postmark operation message.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountToken: ctx.auth.accountToken
    });

    if (ctx.input.action === 'list') {
      let result = await client.listInboundRules({
        count: ctx.input.count,
        offset: ctx.input.offset
      });

      return {
        output: {
          totalCount: result.TotalCount,
          rules: result.InboundRules.map(rule => ({
            ruleId: rule.ID,
            rule: rule.Rule
          }))
        },
        message: `Found **${result.TotalCount}** inbound rule(s).`
      };
    }

    if (ctx.input.action === 'create') {
      let rule = requirePostmarkString(ctx.input.rule, 'rule', 'create');
      let result = await client.createInboundRule(rule);

      return {
        output: {
          rule: {
            ruleId: result.ID,
            rule: result.Rule
          }
        },
        message: `Created inbound rule **${result.Rule}** (ID: ${result.ID}).`
      };
    }

    let ruleId = requirePostmarkNumber(ctx.input.ruleId, 'ruleId', 'delete');
    let result = await client.deleteInboundRule(ruleId);

    return {
      output: {
        deleted: true,
        statusMessage: result.Message
      },
      message: `Deleted inbound rule **${ruleId}**.`
    };
  });
