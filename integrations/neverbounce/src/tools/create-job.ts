import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createJobTool = SlateTool.create(spec, {
  name: 'Create Verification Job',
  key: 'create_verification_job',
  description: `Create a bulk email verification job. Emails can be supplied directly as an array or by providing a remote URL to a CSV file. Supports options to auto-parse, auto-start, run a free sample analysis, enable manual review, and configure a callback URL for job status notifications.`,
  instructions: [
    'Set both autoParse and autoStart to true to immediately begin verification after creation.',
    'Use runSample to get a free bounce estimate before committing credits.',
    'Maximum request size is 25MB when supplying emails directly; use a remote URL for larger lists.'
  ],
  constraints: [
    'Maximum request body size is 25MB for supplied input. Use remote URL for larger lists.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      inputLocation: z
        .enum(['remote_url', 'supplied'])
        .describe('Whether emails are supplied directly or via a remote URL'),
      input: z
        .union([
          z.string().describe('Remote URL pointing to a CSV file'),
          z
            .array(z.record(z.string(), z.string()))
            .describe('Array of objects with email and optional metadata'),
          z
            .array(z.array(z.string()))
            .describe('Array of arrays with email and optional metadata')
        ])
        .describe('Email data: a remote URL string, or an array of email records'),
      filename: z.string().optional().describe('Display name for the job in the dashboard'),
      autoParse: z
        .boolean()
        .optional()
        .describe('Automatically start indexing after creation (default: false)'),
      autoStart: z
        .boolean()
        .optional()
        .describe('Automatically start verification after parsing (default: false)'),
      runSample: z
        .boolean()
        .optional()
        .describe('Run as a free sample to estimate bounce rate (default: false)'),
      allowManualReview: z
        .boolean()
        .optional()
        .describe(
          'Allow job to enter manual review if needed, which may take up to 1 business day (default: false)'
        ),
      callbackUrl: z
        .string()
        .optional()
        .describe('URL to receive job status change notifications via HTTP POST'),
      callbackHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom headers to include in callback requests')
    })
  )
  .output(
    z.object({
      jobId: z.number().describe('The unique identifier for the created job')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createJob({
      inputLocation: ctx.input.inputLocation,
      input: ctx.input.input,
      filename: ctx.input.filename,
      autoParse: ctx.input.autoParse,
      autoStart: ctx.input.autoStart,
      runSample: ctx.input.runSample,
      allowManualReview: ctx.input.allowManualReview,
      callbackUrl: ctx.input.callbackUrl,
      callbackHeaders: ctx.input.callbackHeaders
    });

    return {
      output: {
        jobId: result.jobId
      },
      message: `Verification job **${result.jobId}** created successfully.${ctx.input.filename ? ` Filename: **${ctx.input.filename}**` : ''}`
    };
  })
  .build();
