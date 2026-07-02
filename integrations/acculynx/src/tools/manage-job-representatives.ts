import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageJobRepresentativesTool = SlateTool.create(spec, {
  name: 'Manage Job Representatives',
  key: 'manage_job_representatives',
  description: `View or update the representatives assigned to a job. Assign or change the company representative, sales owner, or A/R owner. You can also remove the sales owner or A/R owner.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      jobId: z.string().describe('The unique ID of the job'),
      companyRepUserId: z
        .string()
        .optional()
        .describe('User ID to assign as company representative'),
      salesOwnerUserId: z.string().optional().describe('User ID to assign as sales owner'),
      removeSalesOwner: z
        .boolean()
        .optional()
        .describe('Set to true to remove the sales owner'),
      arOwnerUserId: z.string().optional().describe('User ID to assign as A/R owner'),
      removeArOwner: z.boolean().optional().describe('Set to true to remove the A/R owner')
    })
  )
  .output(
    z.object({
      representatives: z
        .record(z.string(), z.any())
        .describe('Current representatives after changes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { jobId } = ctx.input;
    let actions: string[] = [];

    if (ctx.input.companyRepUserId) {
      await client.setCompanyRepresentative(jobId, { userId: ctx.input.companyRepUserId });
      actions.push('company representative assigned');
    }

    if (ctx.input.removeSalesOwner) {
      await client.deleteSalesOwner(jobId);
      actions.push('sales owner removed');
    } else if (ctx.input.salesOwnerUserId) {
      await client.setSalesOwner(jobId, { userId: ctx.input.salesOwnerUserId });
      actions.push('sales owner assigned');
    }

    if (ctx.input.removeArOwner) {
      await client.deleteArOwner(jobId);
      actions.push('A/R owner removed');
    } else if (ctx.input.arOwnerUserId) {
      await client.setArOwner(jobId, { userId: ctx.input.arOwnerUserId });
      actions.push('A/R owner assigned');
    }

    let representatives = await client.getJobRepresentatives(jobId);

    return {
      output: { representatives },
      message:
        actions.length > 0
          ? `Updated representatives for job **${jobId}**: ${actions.join(', ')}.`
          : `Retrieved representatives for job **${jobId}**.`
    };
  })
  .build();
