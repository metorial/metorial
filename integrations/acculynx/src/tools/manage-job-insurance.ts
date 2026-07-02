import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageJobInsuranceTool = SlateTool.create(spec, {
  name: 'Manage Job Insurance',
  key: 'manage_job_insurance',
  description: `View or assign insurance information for a job. Set the insurance company, claim number, policy number, and date of loss. Also retrieves the current adjuster assignment.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      jobId: z.string().describe('The unique ID of the job'),
      insuranceCompanyId: z
        .string()
        .optional()
        .describe('ID of the insurance company to assign'),
      claimNumber: z.string().optional().describe('Insurance claim number'),
      policyNumber: z.string().optional().describe('Insurance policy number'),
      dateOfLoss: z.string().optional().describe('Date of loss in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      insurance: z
        .record(z.string(), z.any())
        .optional()
        .describe('Current insurance details'),
      adjuster: z
        .record(z.string(), z.any())
        .optional()
        .describe('Assigned insurance adjuster')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { jobId } = ctx.input;
    let updated = false;

    if (ctx.input.insuranceCompanyId) {
      await client.setJobInsurance(jobId, {
        insuranceCompanyId: ctx.input.insuranceCompanyId,
        claimNumber: ctx.input.claimNumber,
        policyNumber: ctx.input.policyNumber,
        dateOfLoss: ctx.input.dateOfLoss
      });
      updated = true;
    }

    let insurance: any;
    let adjuster: any;

    try {
      insurance = await client.getJobInsurance(jobId);
    } catch (_e) {
      /* may not exist */
    }
    try {
      adjuster = await client.getJobAdjuster(jobId);
    } catch (_e) {
      /* may not exist */
    }

    return {
      output: { insurance, adjuster },
      message: updated
        ? `Updated insurance for job **${jobId}**.`
        : `Retrieved insurance details for job **${jobId}**.`
    };
  })
  .build();
