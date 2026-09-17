import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let outcomes = {
  decline: { state: 'Declined', summary: 'declined' },
  reopen: { state: 'Open', summary: 'reopened' },
  trash: { state: 'Trashed', summary: 'moved to the trash and can still be recovered' },
  recover: { state: 'Recovered', summary: 'recovered from the trash' }
} as const;

export let updateEnquiryStatus = SlateTool.create(spec, {
  name: 'Update Enquiry Status',
  key: 'update_enquiry_status',
  description: `Change the state of an existing enquiry: decline one you cannot fulfil, reopen a declined enquiry to keep working it, move an enquiry to the trash, or recover one from the trash. Moving an enquiry to the trash hides it rather than erasing it, so "recover" puts it back exactly as it was.`,
  instructions: [
    '"trash" and "recover" are the inverse of each other; a trashed enquiry stays recoverable.',
    '"decline" and "reopen" are the inverse of each other; reopening returns a declined enquiry to the open state.',
    'Use the Get Enquiry tool first to check the current state of the enquiry.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      enquiryId: z.number().describe('The ID of the enquiry to update'),
      action: z
        .enum(['decline', 'reopen', 'trash', 'recover'])
        .describe(
          'The change to apply: "decline" rejects the enquiry, "reopen" returns a declined enquiry to the open state, "trash" moves it to the trash without erasing it, and "recover" restores it from the trash'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the change was applied successfully'),
      enquiryId: z.number().describe('The ID of the updated enquiry'),
      action: z.string().describe('The action that was applied'),
      resultingState: z
        .string()
        .describe(
          'The state the enquiry is in after the change: "Declined", "Open", "Trashed", or "Recovered"'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'trash') {
      await client.trashEnquiry(ctx.input.enquiryId);
    } else {
      await client.setEnquiryStatus(ctx.input.enquiryId, ctx.input.action);
    }

    let outcome = outcomes[ctx.input.action];

    return {
      output: {
        success: true,
        enquiryId: ctx.input.enquiryId,
        action: ctx.input.action,
        resultingState: outcome.state
      },
      message: `Enquiry **#${ctx.input.enquiryId}** ${outcome.summary}.`
    };
  })
  .build();
