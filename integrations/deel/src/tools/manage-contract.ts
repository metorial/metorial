import { anyOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  acknowledgedData,
  dataObject,
  objectResponse,
  requireDate,
  requireText,
  resourceSchema
} from '../lib/response';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let manageContract = SlateTool.create(spec, {
  name: 'Manage Contract',
  key: 'manage_contract',
  description: `Perform lifecycle actions on a Deel contract: amend, sign, or terminate. Use action "amend" to modify contract terms, "sign" to sign the contract, or "terminate" to end it.`,
  instructions: [
    'For "amend": provide the amendmentDetails with the fields to change.',
    'For "sign": provide clientSignature as the client signature text. Token and app permissions still apply.',
    'For "terminate": provide terminationDate for scheduled termination or explicitly set terminateNow to true.'
  ],
  tags: {
    destructive: true
  }
})
  .scopes(anyOf('contracts:write'))
  .input(
    z.object({
      contractId: z.string().describe('The unique ID of the contract'),
      action: z
        .enum(['amend', 'sign', 'terminate'])
        .describe('Action to perform on the contract'),
      amendmentDetails: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'For "amend": documented flat fields such as amount, scale, currency, or scopeOfWork; fields depend on the contract type'
        ),
      terminationDate: z
        .string()
        .optional()
        .describe('For "terminate": date of termination (YYYY-MM-DD)'),
      clientSignature: z
        .string()
        .optional()
        .describe('For sign: the client signature text, at least two characters'),
      terminateNow: z
        .boolean()
        .optional()
        .describe('For terminate: explicitly end the contract immediately'),
      terminationReason: z
        .string()
        .optional()
        .describe('For "terminate": reason for termination')
    })
  )
  .output(
    z.object({
      result: resourceSchema.describe(
        'Provider acknowledgement; amendments may require approval and signatures before taking effect'
      )
    })
  )
  .handleInvocation(async ctx => {
    requireText(ctx.input.contractId, 'contractId');
    let client = createClient(ctx);
    let result: unknown;

    switch (ctx.input.action) {
      case 'amend':
        if (!ctx.input.amendmentDetails || !Object.keys(ctx.input.amendmentDetails).length)
          throw createApiServiceError(
            'amendmentDetails must contain the documented contract fields to change.'
          );
        result = await client.amendContract(
          ctx.input.contractId,
          objectResponse(ctx.input.amendmentDetails, 'amendment details')
        );
        return {
          output: { result: dataObject(result, 'contract action') },
          message: `Submitted amendment for contract **${ctx.input.contractId}**.`
        };

      case 'sign': {
        let signature = requireText(ctx.input.clientSignature, 'clientSignature');
        if (signature.trim().length < 2)
          throw createApiServiceError('clientSignature must contain at least two characters.');
        result = await client.signContract(ctx.input.contractId, {
          client_signature: signature
        });
        return {
          output: { result: acknowledgedData(result, 'contract signature') },
          message: `Signed contract **${ctx.input.contractId}**.`
        };
      }

      case 'terminate': {
        let terminationData: Record<string, unknown> = {};
        if (ctx.input.terminateNow && ctx.input.terminationDate)
          throw createApiServiceError(
            'Choose immediate termination or a scheduled terminationDate, not both.'
          );
        if (ctx.input.terminateNow !== true && !ctx.input.terminationDate)
          throw createApiServiceError(
            'terminationDate is required unless terminateNow is explicitly true.'
          );
        if (ctx.input.terminateNow !== undefined)
          terminationData.terminate_now = ctx.input.terminateNow;
        if (ctx.input.terminationDate)
          terminationData.completion_date = requireDate(
            ctx.input.terminationDate,
            'terminationDate'
          );
        if (ctx.input.terminationReason)
          terminationData.termination_reason_description = ctx.input.terminationReason;

        result = await client.terminateContract(ctx.input.contractId, terminationData);
        return {
          output: { result: dataObject(result, 'contract action') },
          message: `Submitted termination for contract **${ctx.input.contractId}**.`
        };
      }
    }
  })
  .build();
