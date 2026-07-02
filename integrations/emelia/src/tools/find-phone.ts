import { SlateTool } from 'slates';
import { z } from 'zod';
import { EmeliaClient } from '../lib/client';
import { spec } from '../spec';

export let findPhone = SlateTool.create(spec, {
  name: 'Find Phone Number',
  key: 'find_phone',
  description: `Find the phone number of a contact. Submit a job with the person's name and company details, then optionally poll for the result. Uses credit-based billing.`,
  constraints: ['Credits are consumed only when a phone number is found.']
})
  .input(
    z.object({
      firstName: z.string().describe('First name of the person'),
      lastName: z.string().describe('Last name of the person'),
      companyName: z.string().describe('Company name'),
      website: z.string().optional().describe('Company website URL'),
      country: z.string().optional().describe('Country of the person'),
      submitOnly: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, only submit the job without waiting'),
      jobId: z.string().optional().describe('Existing job ID to check')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('Job ID'),
      status: z.string().optional().describe('Job status'),
      phoneNumber: z.string().optional().describe('Found phone number'),
      result: z.record(z.string(), z.unknown()).optional().describe('Full result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EmeliaClient(ctx.auth.token);
    let { firstName, lastName, companyName, website, country, submitOnly, jobId } = ctx.input;

    if (jobId) {
      let result = await client.getFindPhoneResult(jobId);
      return {
        output: {
          jobId,
          status: result?.status || 'unknown',
          phoneNumber: result?.phone || result?.phoneNumber,
          result
        },
        message:
          result?.phone || result?.phoneNumber
            ? `Found phone: **${result.phone || result.phoneNumber}**`
            : `Job **${jobId}** status: **${result?.status || 'pending'}**.`
      };
    }

    let job = await client.findPhone({ firstName, lastName, companyName, website, country });
    let submittedJobId = job?.jobId || job?._id || job?.id;

    if (submitOnly || !submittedJobId) {
      return {
        output: { jobId: submittedJobId, status: 'submitted', result: job },
        message: `Phone find job submitted. Job ID: **${submittedJobId}**.`
      };
    }

    let attempts = 0;
    while (attempts < 10) {
      await new Promise(r => setTimeout(r, 3000));
      let result = await client.getFindPhoneResult(submittedJobId);
      if (
        result?.status === 'completed' ||
        result?.status === 'done' ||
        result?.phone ||
        result?.phoneNumber
      ) {
        return {
          output: {
            jobId: submittedJobId,
            status: 'completed',
            phoneNumber: result.phone || result.phoneNumber,
            result
          },
          message:
            result.phone || result.phoneNumber
              ? `Found phone: **${result.phone || result.phoneNumber}** for ${firstName} ${lastName}.`
              : `Job completed but no phone found for ${firstName} ${lastName}.`
        };
      }
      if (result?.status === 'failed' || result?.status === 'error') {
        return {
          output: { jobId: submittedJobId, status: 'failed', result },
          message: `Phone find job **failed** for ${firstName} ${lastName}.`
        };
      }
      attempts++;
    }

    return {
      output: { jobId: submittedJobId, status: 'pending' },
      message: `Job **${submittedJobId}** is still processing. Check the result later using the jobId.`
    };
  })
  .build();
