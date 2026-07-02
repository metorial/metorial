import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getJobTool = SlateTool.create(spec, {
  name: 'Get Job Details',
  key: 'get_job',
  description: `Retrieve comprehensive details for a specific job, including its current milestone, representatives, insurance info, contacts, and change history. Specify which related data to include.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('The unique ID of the job'),
      includeMilestone: z
        .boolean()
        .optional()
        .describe('Include current milestone information'),
      includeRepresentatives: z
        .boolean()
        .optional()
        .describe('Include assigned representatives (company rep, sales owner, A/R owner)'),
      includeInsurance: z
        .boolean()
        .optional()
        .describe('Include insurance and adjuster details'),
      includeContacts: z.boolean().optional().describe('Include job contacts'),
      includeHistory: z.boolean().optional().describe('Include job change history')
    })
  )
  .output(
    z.object({
      job: z.record(z.string(), z.any()).describe('Job details'),
      milestone: z
        .record(z.string(), z.any())
        .optional()
        .describe('Current milestone information'),
      representatives: z
        .record(z.string(), z.any())
        .optional()
        .describe('Assigned representatives'),
      insurance: z.record(z.string(), z.any()).optional().describe('Insurance details'),
      adjuster: z
        .record(z.string(), z.any())
        .optional()
        .describe('Insurance adjuster details'),
      contacts: z.array(z.record(z.string(), z.any())).optional().describe('Job contacts'),
      history: z.array(z.record(z.string(), z.any())).optional().describe('Job change history')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { jobId } = ctx.input;

    let job = await client.getJob(jobId);

    let milestone: any;
    let representatives: any;
    let insurance: any;
    let adjuster: any;
    let contacts: any;
    let history: any;

    if (ctx.input.includeMilestone) {
      try {
        milestone = await client.getJobCurrentMilestone(jobId);
      } catch (_e) {
        /* optional */
      }
    }
    if (ctx.input.includeRepresentatives) {
      try {
        representatives = await client.getJobRepresentatives(jobId);
      } catch (_e) {
        /* optional */
      }
    }
    if (ctx.input.includeInsurance) {
      try {
        insurance = await client.getJobInsurance(jobId);
        adjuster = await client.getJobAdjuster(jobId);
      } catch (_e) {
        /* optional */
      }
    }
    if (ctx.input.includeContacts) {
      try {
        let result = await client.getJobContacts(jobId);
        contacts = Array.isArray(result) ? result : (result?.items ?? result?.data ?? []);
      } catch (_e) {
        /* optional */
      }
    }
    if (ctx.input.includeHistory) {
      try {
        let result = await client.getJobHistory(jobId);
        history = Array.isArray(result) ? result : (result?.items ?? result?.data ?? []);
      } catch (_e) {
        /* optional */
      }
    }

    return {
      output: { job, milestone, representatives, insurance, adjuster, contacts, history },
      message: `Retrieved details for job **${jobId}**.`
    };
  })
  .build();
