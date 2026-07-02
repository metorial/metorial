import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let manageContract = SlateTool.create(spec, {
  name: 'Manage Contract',
  key: 'manage_contract',
  description: `Perform lifecycle actions on a Deel contract: amend, sign, or terminate. Use action "amend" to modify contract terms, "sign" to sign the contract, or "terminate" to end it.`,
  instructions: [
    'For "amend": provide the amendmentDetails with the fields to change.',
    'For "sign": only the contractId is needed. Contracts cannot be signed with organization tokens.',
    'For "terminate": provide a terminationDate and optionally a reason.'
  ],
  tags: {
    destructive: true
  }
})
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
          'For "amend": fields to update on the contract (e.g. compensation_details, scope_of_work)'
        ),
      terminationDate: z
        .string()
        .optional()
        .describe('For "terminate": date of termination (YYYY-MM-DD)'),
      terminationReason: z
        .string()
        .optional()
        .describe('For "terminate": reason for termination')
    })
  )
  .output(
    z.object({
      result: z.record(z.string(), z.any()).describe('Result of the action')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result: any;

    switch (ctx.input.action) {
      case 'amend':
        result = await client.amendContract(
          ctx.input.contractId,
          ctx.input.amendmentDetails ?? {}
        );
        return {
          output: { result: result?.data ?? result },
          message: `Amended contract **${ctx.input.contractId}**.`
        };

      case 'sign':
        result = await client.signContract(ctx.input.contractId);
        return {
          output: { result: result?.data ?? result },
          message: `Signed contract **${ctx.input.contractId}**.`
        };

      case 'terminate': {
        let terminationData: Record<string, any> = {};
        if (ctx.input.terminationDate)
          terminationData.termination_date = ctx.input.terminationDate;
        if (ctx.input.terminationReason) terminationData.reason = ctx.input.terminationReason;

        result = await client.terminateContract(ctx.input.contractId, terminationData);
        return {
          output: { result: result?.data ?? result },
          message: `Terminated contract **${ctx.input.contractId}**.`
        };
      }
    }
  })
  .build();
