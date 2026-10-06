import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, invalid } from '../lib/client';
import { spec } from '../spec';

export let moveLeads = SlateTool.create(spec, {
  name: 'Move Leads',
  key: 'move_leads',
  description: `Submit a background job to transfer specified leads from a source campaign or list to a destination campaign or list. Moving to an active campaign can initiate sending. Use get_background_job to check completion.`
})
  .input(
    z.object({
      leadIds: z.array(z.string()).describe('IDs of leads to move.'),
      fromCampaignId: z.string().optional().describe('Source campaign ID.'),
      toCampaignId: z.string().optional().describe('Destination campaign ID.'),
      fromListId: z.string().optional().describe('Source lead list ID.'),
      toListId: z.string().optional().describe('Destination lead list ID.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the move request was accepted'),
      jobId: z.string().optional().describe('Background job ID for get_background_job.'),
      status: z.string().optional().describe('Observed background job status.'),
      completed: z
        .boolean()
        .optional()
        .describe('Whether the returned job has already succeeded.')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.leadIds.length) throw invalid('Provide at least one lead ID.');
    if (!ctx.input.fromCampaignId && !ctx.input.fromListId) {
      throw invalid('Provide a source fromCampaignId or fromListId when selecting lead IDs.');
    }
    if (Boolean(ctx.input.toCampaignId) === Boolean(ctx.input.toListId)) {
      throw invalid('Provide exactly one destination toCampaignId or toListId.');
    }
    let client = new Client({ token: ctx.auth.token });

    let result = await client.moveLeads({
      leadIds: ctx.input.leadIds,
      fromCampaignId: ctx.input.fromCampaignId,
      toCampaignId: ctx.input.toCampaignId,
      fromListId: ctx.input.fromListId,
      toListId: ctx.input.toListId
    });
    if (typeof result.id !== 'string' || typeof result.status !== 'string') {
      throw invalid(
        'Move submission did not return a job identifier and status. Read back before retrying.'
      );
    }

    return {
      output: {
        success: true,
        jobId: result.id,
        status: result.status,
        completed: result.status === 'success'
      },
      message: `Submitted a move job for **${ctx.input.leadIds.length}** lead(s). Check the job and destination before assuming completion.`
    };
  })
  .build();
