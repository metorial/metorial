import { SlateTool } from 'slates';
import { z } from 'zod';
import { EmeliaClient } from '../lib/client';
import { spec } from '../spec';

export let findEmail = SlateTool.create(spec, {
  name: 'Find Email',
  key: 'find_email',
  description: `Find the professional email address of a contact. Submit a job with the person's name and company details, then optionally poll for the result. Uses credit-based billing — credits are only consumed when an email is found.`,
  instructions: [
    'This is an asynchronous operation. If submitOnly is false (default), the tool will poll for the result.',
    'If you only want to submit the job, set submitOnly to true and use the returned jobId to check the result later.'
  ],
  constraints: ['Credits are consumed only when an email is found.']
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
        .describe(
          'If true, only submit the job and return the job ID without waiting for the result'
        ),
      jobId: z
        .string()
        .optional()
        .describe('Existing job ID to check the result for (skip submission)')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('Job ID for tracking the async result'),
      status: z.string().optional().describe('Job status'),
      email: z.string().optional().describe('Found email address'),
      result: z.record(z.string(), z.unknown()).optional().describe('Full result details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EmeliaClient(ctx.auth.token);
    let { firstName, lastName, companyName, website, country, submitOnly, jobId } = ctx.input;

    if (jobId) {
      let result = await client.getFindEmailResult(jobId);
      return {
        output: {
          jobId,
          status: result?.status || 'unknown',
          email: result?.email,
          result
        },
        message: result?.email
          ? `Found email: **${result.email}**`
          : `Job **${jobId}** status: **${result?.status || 'pending'}**.`
      };
    }

    let job = await client.findEmail({ firstName, lastName, companyName, website, country });
    let submittedJobId = job?.jobId || job?._id || job?.id;

    if (submitOnly || !submittedJobId) {
      return {
        output: { jobId: submittedJobId, status: 'submitted', result: job },
        message: `Email find job submitted. Job ID: **${submittedJobId}**.`
      };
    }

    // Poll for result (up to 30 seconds)
    let attempts = 0;
    while (attempts < 10) {
      await new Promise(r => setTimeout(r, 3000));
      let result = await client.getFindEmailResult(submittedJobId);
      if (result?.status === 'completed' || result?.status === 'done' || result?.email) {
        return {
          output: {
            jobId: submittedJobId,
            status: 'completed',
            email: result.email,
            result
          },
          message: result.email
            ? `Found email: **${result.email}** for ${firstName} ${lastName} at ${companyName}.`
            : `Job completed but no email found for ${firstName} ${lastName} at ${companyName}.`
        };
      }
      if (result?.status === 'failed' || result?.status === 'error') {
        return {
          output: { jobId: submittedJobId, status: 'failed', result },
          message: `Email find job **failed** for ${firstName} ${lastName} at ${companyName}.`
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
