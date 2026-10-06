import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import { spec } from '../spec';

export let evaluateSignalTool = SlateTool.create(spec, {
  name: 'Evaluate ACH Risk',
  key: 'evaluate_signal',
  description: `Assess the return risk of a planned ACH debit transaction using Plaid Signal. Creates a retained evaluation that can incur charges. Returns available risk scores or a ruleset result; Balance-only rulesets may return no scores. A missing score is not zero risk.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      accessToken: z.string().describe('Access token for the Plaid Item'),
      accountId: z.string().describe('Account ID to evaluate the ACH against'),
      clientTransactionId: z
        .string()
        .describe('Your unique transaction identifier (max 36 chars)'),
      amount: z.number().describe('Transaction amount in dollars'),
      userPresent: z
        .boolean()
        .optional()
        .describe('Legacy user-presence hint; currently deprecated by Plaid'),
      rulesetKey: z
        .string()
        .optional()
        .describe('Configured Signal ruleset key; omit to use the provider default')
    })
  )
  .output(
    z.object({
      customerInitiatedReturnRisk: z
        .number()
        .nullable()
        .describe(
          'Provider score, or null when unavailable; higher means greater return risk'
        ),
      bankInitiatedReturnRisk: z
        .number()
        .nullable()
        .describe('Provider score, or null when unavailable'),
      availableBalance: z
        .number()
        .nullable()
        .optional()
        .describe('Available account balance if known'),
      currentBalance: z
        .number()
        .nullable()
        .optional()
        .describe('Current account balance if known'),
      rulesetResult: z
        .string()
        .nullable()
        .optional()
        .describe('Ruleset decision: ACCEPT, REROUTE, or REVIEW'),
      warnings: z.array(z.any()).optional().describe('Provider warnings'),
      rulesetKey: z.string().optional().describe('Actual ruleset key returned by Plaid')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaidClient({
      clientId: ctx.auth.clientId,
      secret: ctx.auth.secret,
      environment: ctx.config.environment
    });

    let result = await client.evaluateSignal({
      accessToken: ctx.input.accessToken,
      accountId: ctx.input.accountId,
      clientTransactionId: ctx.input.clientTransactionId,
      amount: ctx.input.amount,
      userPresent: ctx.input.userPresent,
      rulesetKey: ctx.input.rulesetKey
    });

    return {
      output: {
        customerInitiatedReturnRisk:
          result.scores?.customer_initiated_return_risk?.score ?? null,
        bankInitiatedReturnRisk: result.scores?.bank_initiated_return_risk?.score ?? null,
        availableBalance: result.core_attributes?.available_balance ?? null,
        currentBalance: result.core_attributes?.current_balance ?? null,
        rulesetResult: result.ruleset?.result ?? null,
        warnings: result.warnings,
        rulesetKey: result.ruleset?.ruleset_key
      },
      message: `Signal evaluation completed${result.ruleset?.result ? ` — ruleset result: ${result.ruleset.result}` : ''}. Scores are absent when the selected ruleset or product does not return them.`
    };
  })
  .build();
