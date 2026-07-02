import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelPrintJob = SlateTool.create(spec, {
  name: 'Cancel Print Job',
  key: 'cancel_print_job',
  description: `Cancel or delete a print job. If the print job is a draft (not confirmed), it will be deleted. If confirmed, all letters with status "waiting_to_print" will be cancelled and refunded. Letters already in production cannot be cancelled.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      printJobId: z.string().describe('The ID of the print job to cancel or delete')
    })
  )
  .output(
    z.object({
      printJobId: z.string().describe('The print job ID'),
      cancelled: z.boolean().describe('Whether the cancellation was successful'),
      message: z.string().describe('Details about the cancellation result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deletePrintJob(ctx.input.printJobId);

    let output = {
      printJobId: ctx.input.printJobId,
      cancelled: true,
      message: result?.confirmed
        ? 'Confirmed print job cancelled. Letters with waiting_to_print status have been cancelled and refunded.'
        : 'Draft print job deleted.'
    };

    return {
      output,
      message: `Print job **${ctx.input.printJobId}** has been cancelled/deleted.`
    };
  })
  .build();
