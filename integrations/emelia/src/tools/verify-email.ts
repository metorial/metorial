import { SlateTool } from 'slates';
import { z } from 'zod';
import { EmeliaClient } from '../lib/client';
import { spec } from '../spec';

export let verifyEmail = SlateTool.create(spec, {
  name: 'Verify Email',
  key: 'verify_email',
  description: `Verify whether an email address is valid and deliverable. Submit a verification job and optionally poll for the result.`
})
  .input(
    z.object({
      email: z.string().describe('Email address to verify'),
      submitOnly: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, only submit without waiting'),
      jobId: z.string().optional().describe('Existing job ID to check')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('Job ID'),
      status: z.string().optional().describe('Job status'),
      verified: z.boolean().optional().describe('Whether the email is verified/valid'),
      result: z.record(z.string(), z.unknown()).optional().describe('Full verification result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EmeliaClient(ctx.auth.token);
    let { email, submitOnly, jobId } = ctx.input;

    if (jobId) {
      let result = await client.getVerifyEmailResult(jobId);
      return {
        output: {
          jobId,
          status: result?.status || 'unknown',
          verified: result?.verified ?? result?.valid,
          result
        },
        message: `Verification job **${jobId}**: **${result?.status || 'pending'}**.`
      };
    }

    let job = await client.verifyEmail({ email });
    let submittedJobId = job?.jobId || job?._id || job?.id;

    if (submitOnly || !submittedJobId) {
      return {
        output: { jobId: submittedJobId, status: 'submitted', result: job },
        message: `Email verification job submitted for **${email}**. Job ID: **${submittedJobId}**.`
      };
    }

    let attempts = 0;
    while (attempts < 10) {
      await new Promise(r => setTimeout(r, 3000));
      let result = await client.getVerifyEmailResult(submittedJobId);
      if (
        result?.status === 'completed' ||
        result?.status === 'done' ||
        result?.verified !== undefined ||
        result?.valid !== undefined
      ) {
        let isValid = result.verified ?? result.valid;
        return {
          output: {
            jobId: submittedJobId,
            status: 'completed',
            verified: isValid,
            result
          },
          message: `Email **${email}** is **${isValid ? 'valid' : 'invalid'}**.`
        };
      }
      if (result?.status === 'failed' || result?.status === 'error') {
        return {
          output: { jobId: submittedJobId, status: 'failed', result },
          message: `Email verification **failed** for **${email}**.`
        };
      }
      attempts++;
    }

    return {
      output: { jobId: submittedJobId, status: 'pending' },
      message: `Verification for **${email}** is still processing. Job ID: **${submittedJobId}**.`
    };
  })
  .build();
