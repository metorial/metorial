import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  Client,
  optionalBoolean,
  optionalNumber,
  optionalRow,
  optionalText,
  text
} from '../lib/client';
import { spec } from '../spec';

export let emailVerifier = SlateTool.create(spec, {
  name: 'Verify Email',
  key: 'verify_email',
  description: `Verify the deliverability of an email address. Returns detailed verification results including status, confidence score, and checks for regex validity, MX records, SMTP connectivity, disposable/webmail detection, and more.`,
  constraints: [
    'Webmail addresses (Gmail, Yahoo, etc.) are not fully verified since Hunter focuses on B2B.',
    'If verification is still in progress, a 202 status is returned — retry after a short delay.',
    'A 222 response means a temporary remote mail-server failure; no verification result is available. Retry later.',
    'Verification uses account credits and can save the address as a lead unless auto-save is disabled in the account settings.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address to verify')
    })
  )
  .output(
    z.object({
      email: z.string().describe('The email address verified'),
      status: z
        .string()
        .describe(
          'Verification status: valid, invalid, accept_all, webmail, disposable, unknown, or pending'
        ),
      pending: z
        .boolean()
        .describe('Whether the provider returned HTTP 202 and verification is still running'),
      score: z.number().nullable().describe('Confidence score from 0 to 100'),
      regexp: z.boolean().nullable().describe('Whether the email passes regex validation'),
      gibberish: z.boolean().nullable().describe('Whether the email appears to be gibberish'),
      disposable: z
        .boolean()
        .nullable()
        .describe('Whether the email is from a disposable provider'),
      webmail: z.boolean().nullable().describe('Whether the email is from a webmail provider'),
      mxRecords: z
        .boolean()
        .nullable()
        .describe('Whether MX records are found for the domain'),
      smtpServer: z.boolean().nullable().describe('Whether the SMTP server is reachable'),
      smtpCheck: z.boolean().nullable().describe('Whether the SMTP check passed'),
      acceptAll: z.boolean().nullable().describe('Whether the server accepts all emails')
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client({ token: ctx.auth.token }).verifyEmail(ctx.input.email);
    const data = optionalRow(result.data),
      pending = result.httpStatus === 202;
    const status = pending ? 'pending' : text(data.status, 'verification status');
    return {
      output: {
        email: optionalText(data.email) ?? ctx.input.email,
        status,
        pending,
        score: optionalNumber(data.score) ?? null,
        regexp: optionalBoolean(data.regexp) ?? null,
        gibberish: optionalBoolean(data.gibberish) ?? null,
        disposable: optionalBoolean(data.disposable) ?? null,
        webmail: optionalBoolean(data.webmail) ?? null,
        mxRecords: optionalBoolean(data.mx_records) ?? null,
        smtpServer: optionalBoolean(data.smtp_server) ?? null,
        smtpCheck: optionalBoolean(data.smtp_check) ?? null,
        acceptAll: optionalBoolean(data.accept_all) ?? null
      },
      message: pending
        ? 'Verification is pending. Poll verify_email again for the same address; the provider counts these requests once.'
        : `Email verification result: **${status}**.`
    };
  })
  .build();
