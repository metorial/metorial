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
      cancelled:
        result?.deleted === true ||
        result?.letters?.some(
          (letter: { status: string }) => letter.status === 'cancelled'
        ) === true,
      message:
        result?.deleted === true
          ? 'Draft print job deleted.'
          : 'Cancellation processed. Eligible mail items were cancelled and refunded; items already in production or sent remain unchanged.'
    };

    return {
      output,
      message: `Print job **${ctx.input.printJobId}**: ${output.message}`
    };
  })
  .build();
