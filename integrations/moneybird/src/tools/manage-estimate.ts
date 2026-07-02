import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { spec } from '../spec';

export let manageEstimate = SlateTool.create(spec, {
  name: 'Manage Estimate',
  key: 'manage_estimate',
  description: `Perform actions on an existing estimate: send via email, change state (accept, reject, mark as open/late/archived), convert an accepted estimate to an invoice (bill), or delete.`,
  instructions: [
    'Set exactly one action per invocation.',
    'Use "changeState" with the desired newState to transition the estimate.',
    'Use "bill" to convert an accepted estimate into a sales invoice.'
  ]
})
  .input(
    z.object({
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
  .output(
    z.object({
      estimateId: z.string(),
      estimateNumber: z.string().nullable(),
      state: z.string().nullable(),
      actionPerformed: z.string(),
      billedInvoiceId: z
        .string()
        .nullable()
        .describe('ID of the invoice created from billing the estimate')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoneybirdClient({
      token: ctx.auth.token,
      administrationId: ctx.config.administrationId
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
        estimateNumber = est.estimate_id || null;
        break;
      }
      case 'changeState': {
        if (!ctx.input.newState)
          throw new Error('newState is required for changeState action');
        let est = await client.changeEstimateState(estimateId, ctx.input.newState);
        resultState = est.state;
        estimateNumber = est.estimate_id || null;
        break;
      }
      case 'bill': {
        let inv = await client.billEstimate(estimateId);
        billedInvoiceId = String(inv.id);
        resultState = 'billed';
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
