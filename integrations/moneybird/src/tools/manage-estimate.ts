import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { administrationIdSchema } from '../lib/schemas';
import {
  checkedOutput,
  exactId,
  fail,
  nullableId,
  validateToolInput
} from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  nextPage: z.number().int().positive().optional(),
  previousPage: z.number().int().positive().optional(),
  estimateId: z.string(),
  estimateNumber: z.string().nullable(),
  state: z.string().nullable(),
  actionPerformed: z.string(),
  billedInvoiceId: z
    .string()
    .nullable()
    .describe('ID of the invoice created from billing the estimate')
});

export let manageEstimate = SlateTool.create(spec, {
  name: 'Manage Estimate',
  key: 'manage_estimate',
  description: `Perform actions on an existing estimate: send via email, change state (accept, reject, mark as open/late/archived), convert an accepted estimate to an invoice (bill), or delete. Call list_administrations to choose administrationId when no default is saved.`,
  instructions: [
    'Set exactly one action per invocation.',
    'Use "changeState" with the desired newState to transition the estimate.',
    'Use "bill" to convert an accepted estimate into a sales invoice.'
  ]
})
  .input(
    z.object({
      administrationId: administrationIdSchema,
      estimateId: z.string().describe('Estimate ID'),
      action: z.enum(['send', 'changeState', 'bill', 'delete']).describe('Action to perform'),
      newState: z
        .enum(['open', 'accepted', 'rejected', 'billed', 'late', 'archived'])
        .optional()
        .describe('New state (for "changeState" action)'),
      sendMethod: z
        .enum(['Email', 'Post', 'Manual'])
        .optional()
        .describe('Delivery method (for "send" action)'),
      emailAddress: z
        .string()
        .optional()
        .describe('Override email address (for "send" action)')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    validateToolInput('manage_estimate', ctx.input);
    return checkedOutput(outputSchema, async () => {
      let client = new MoneybirdClient({
        token: ctx.auth.token,
        administrationId: ctx.input.administrationId ?? ctx.config.administrationId
      });

      let { estimateId, action } = ctx.input;
      let resultState: string | null = null;
      let estimateNumber: string | null = null;
      let billedInvoiceId: string | null = null;

      switch (action) {
        case 'send': {
          let sendOpts: Record<string, any> = {};
          if (ctx.input.sendMethod) sendOpts.delivery_method = ctx.input.sendMethod;
          if (ctx.input.emailAddress) sendOpts.email_address = ctx.input.emailAddress;
          let est = await client.sendEstimate(estimateId, sendOpts);
          resultState = est.state;
          estimateNumber = est.estimate_id ?? null;
          break;
        }
        case 'changeState': {
          if (!ctx.input.newState) throw fail('newState is required for changeState action');
          let est = await client.changeEstimateState(estimateId, ctx.input.newState);
          if (est.state !== ctx.input.newState)
            throw fail(
              'The requested estimate state could not be confirmed. Read the estimate and reconcile before retrying.'
            );
          resultState = est.state;
          estimateNumber = est.estimate_id ?? null;
          break;
        }
        case 'bill': {
          let inv = await client.billEstimate(estimateId);
          billedInvoiceId = exactId(inv.id);
          if (nullableId(inv.original_estimate_id) !== estimateId)
            throw fail(
              'Invoice creation returned an inconsistent estimate relationship. Reconcile before retrying.'
            );
          const estimate = await client.getEstimate(estimateId);
          resultState = estimate.state;
          estimateNumber = estimate.estimate_id ?? null;
          break;
        }
        case 'delete': {
          await client.deleteEstimate(estimateId);
          resultState = 'deleted';
          break;
        }
      }

      return {
        output: {
          estimateId,
          estimateNumber,
          state: resultState,
          actionPerformed: action,
          billedInvoiceId
        },
        message: `Performed **${action}** on estimate ${estimateNumber || estimateId}${resultState ? ` (state: ${resultState})` : ''}.`
      };
    });
  })
  .build();
