import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteLead = SlateTool.create(spec, {
  name: 'Remove Lead from Campaign',
  key: 'delete_lead',
  description: `Unsubscribe a lead from its campaign by default, or permanently remove that campaign lead when permanentlyDelete is true. Unsubscribing preserves the lead record. Permanently removing the lead does not delete its separate global contact or undo external CRM effects.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('The ID of the campaign'),
      leadId: z.string().describe('The ID of the lead to remove'),
      permanentlyDelete: z
        .boolean()
        .optional()
        .describe('If true, permanently deletes the lead instead of unsubscribing')
    })
  )
  .output(
    z.object({
      leadId: z.string(),
      removed: z
        .boolean()
        .describe(
          'The provider accepted the requested removal or unsubscription; this does not imply global-contact deletion.'
        ),
      operation: z.enum(['deleted', 'unsubscribed']).optional()
    })
  )
  .handleInvocation(async ctx => {
    await new Client({ token: ctx.auth.token }).deleteLead(
      ctx.input.campaignId,
      ctx.input.leadId,
      ctx.input.permanentlyDelete ? 'remove' : undefined
    );
    return {
      output: {
        leadId: ctx.input.leadId,
        removed: true,
        operation: ctx.input.permanentlyDelete ? 'deleted' : 'unsubscribed'
      },
      message: ctx.input.permanentlyDelete
        ? 'The campaign lead record was permanently removed. Its separate global contact may still exist.'
        : 'The provider accepted the campaign lead unsubscription. The lead record was not permanently deleted.'
    };
  })
  .build();
