import { SlateTool } from 'slates';
import { z } from 'zod';
import { DetrackClient } from '../lib/client';
import { spec } from '../spec';

export let deleteJobTool = SlateTool.create(spec, {
  name: 'Delete Job',
  key: 'delete_job',
  description: `Permanently deletes a delivery or collection job from Detrack. This action cannot be undone.`,
  instructions: ['Both doNumber and date are required to identify the job.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      doNumber: z.string().describe('Delivery order number of the job to delete'),
      date: z.string().describe('Job date in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      doNumber: z.string().describe('Delivery order number of the deleted job'),
      date: z.string().describe('Date of the deleted job'),
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DetrackClient(ctx.auth.token);

    await client.deleteJob(ctx.input.doNumber, ctx.input.date);

    return {
      output: {
        doNumber: ctx.input.doNumber,
        date: ctx.input.date,
        success: true
      },
      message: `Deleted job **${ctx.input.doNumber}** for ${ctx.input.date}.`
    };
  })
  .build();
