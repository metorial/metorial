import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import { spec } from '../spec';

export let evaluateSignalTool = SlateTool.create(spec, {
  name: 'Evaluate ACH Risk',
  key: 'evaluate_signal',
  description: `Assess the return risk of a planned ACH debit transaction using Plaid Signal. Returns risk scores for both customer-initiated and bank-initiated returns to help decide whether to proceed, delay, or reject a transaction.`,
  tags: {
    readOnly: true
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
        .describe('Whether the user is currently present in the session')
    })
  )
  .output(
    z.object({
      customerInitiatedReturnRisk: z
        .number()
        .describe('Risk score for customer-initiated returns (higher = riskier)'),
      bankInitiatedReturnRisk: z
        .number()
        .describe('Risk score for bank-initiated returns (higher = riskier)'),
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
      warnings: z.array(z.any()).optional().describe('Any warnings from the evaluation')
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
      userPresent: ctx.input.userPresent
    });

    return {
      output: {
        customerInitiatedReturnRisk: result.scores?.customer_initiated_return_risk?.score ?? 0,
        bankInitiatedReturnRisk: result.scores?.bank_initiated_return_risk?.score ?? 0,
        availableBalance: result.core_attributes?.available_balance ?? null,
        currentBalance: result.core_attributes?.current_balance ?? null,
        rulesetResult: result.ruleset?.result ?? null,
        warnings: result.warnings || []
      },
      message: `ACH risk assessment — Customer-initiated: **${result.scores?.customer_initiated_return_risk?.score}**, Bank-initiated: **${result.scores?.bank_initiated_return_risk?.score}**${result.ruleset?.result ? ` — Ruleset: **${result.ruleset.result}**` : ''}.`
    };
  })
  .build();
