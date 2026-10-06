import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import { invalid } from '../lib/validation';
import { spec } from '../spec';

export const manageTransferAuthorizationTool = SlateTool.create(spec, {
  name: 'Manage Transfer Authorization',
  key: 'manage_transfer_authorization',
  description:
    'Evaluate authorization for a proposed USD transfer, or cancel an unused authorization. An approved decision is not a completed transfer. Review any decision rationale, including approved decisions with a rationale, before proceeding. User action may require the Transfer UI Link flow.',
  instructions: [
    'Create requires accessToken, accountId, type, network, amount and userLegalName. ACH also requires achClass; credits allow ccd or ppd, while tel and web apply only to debits.',
    'Use a stable idempotencyKey for authorization creation. The proposed amount may differ from the requested amount for Adaptive Guarantee.',
    'Cancel requires authorizationId. Cancellation returns a provider acknowledgment; there is no public authorization lookup endpoint in this API.'
  ],
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      action: z.enum(['create', 'cancel']).describe('Authorization operation'),
      accessToken: z.string().optional().describe('Access token for the authorized Item'),
      accountId: z.string().optional().describe('Consented account identity'),
      type: z.enum(['debit', 'credit']).optional().describe('Transfer direction'),
      network: z
        .enum(['ach', 'same-day-ach', 'rtp'])
        .optional()
        .describe('Supported transfer network'),
      amount: z
        .string()
        .optional()
        .describe('Positive USD decimal string with two fractional digits'),
      achClass: z
        .enum(['ccd', 'ppd', 'tel', 'web'])
        .optional()
        .describe('ACH SEC class, required for ACH; credits permit ccd or ppd only'),
      userLegalName: z.string().optional().describe('Consented end user legal name'),
      idempotencyKey: z
        .string()
        .optional()
        .describe('Stable authorization key, at most 50 characters'),
      authorizationId: z.string().optional().describe('Unused authorization to cancel')
    })
  )
  .output(
    z.object({
      action: z.enum(['create', 'cancel']),
      authorizationId: z.string(),
      requestId: z.string().describe('Provider request receipt'),
      cancellationAcknowledged: z
        .boolean()
        .optional()
        .describe('Cancellation endpoint acknowledgment, without an independent state lookup'),
      decision: z.enum(['approved', 'declined', 'user_action_required']).optional(),
      rationale: z
        .object({ code: z.string().nullable(), description: z.string() })
        .nullable()
        .optional(),
      created: z.string().optional(),
      accountId: z.string().optional(),
      type: z.string().optional(),
      network: z.string().optional(),
      requestedAmount: z.string().optional(),
      proposedAmount: z.string().optional(),
      isoCurrencyCode: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new PlaidClient({ ...ctx.auth, environment: ctx.config.environment });
    if (ctx.input.action === 'cancel') {
      if (ctx.input.authorizationId === undefined)
        invalid('Provide authorizationId to cancel an unused authorization.');
      const result = await client.cancelTransferAuthorization(ctx.input.authorizationId);
      return {
        output: {
          action: ctx.input.action,
          authorizationId: ctx.input.authorizationId,
          requestId: result.request_id,
          cancellationAcknowledged: true
        },
        message:
          'Plaid acknowledged authorization cancellation. No independent authorization lookup is available.'
      };
    }
    const { accessToken, accountId, type, network, amount, userLegalName } = ctx.input;
    if (
      accessToken === undefined ||
      accountId === undefined ||
      type === undefined ||
      network === undefined ||
      amount === undefined ||
      userLegalName === undefined
    )
      invalid(
        'Create requires accessToken, accountId, type, network, amount and userLegalName.'
      );
    const result = await client.createTransferAuthorization({
      accessToken,
      accountId,
      type,
      network,
      amount,
      userLegalName,
      achClass: ctx.input.achClass,
      idempotencyKey: ctx.input.idempotencyKey
    });
    const authorization = result.authorization;
    const proposed = authorization.proposed_transfer;
    return {
      output: {
        action: ctx.input.action,
        authorizationId: authorization.id,
        requestId: result.request_id,
        decision: authorization.decision,
        rationale: authorization.decision_rationale,
        created: authorization.created,
        accountId: proposed.account_id,
        type: proposed.type,
        network: proposed.network,
        requestedAmount: proposed.requested_amount,
        proposedAmount: proposed.amount,
        isoCurrencyCode: proposed.iso_currency_code
      },
      message: `Authorization decision: ${authorization.decision}. Review the rationale and proposed amount before any transfer; no funds were moved by this operation.`
    };
  })
  .build();
