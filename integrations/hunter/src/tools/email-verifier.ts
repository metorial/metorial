import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let emailVerifier = SlateTool.create(spec, {
  name: 'Verify Email',
  key: 'verify_email',
  description: `Verify the deliverability of an email address. Returns detailed verification results including status, confidence score, and checks for regex validity, MX records, SMTP connectivity, disposable/webmail detection, and more.`,
  constraints: [
    'Webmail addresses (Gmail, Yahoo, etc.) are not fully verified since Hunter focuses on B2B.',
    'If verification is still in progress, a 202 status is returned — retry after a short delay.'
  ],
  tags: {
    readOnly: true
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
          'Verification status: valid, invalid, accept_all, webmail, disposable, or unknown'
        ),
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
    let client = new Client({ token: ctx.auth.token });

    let result = await client.verifyEmail(ctx.input.email);
    let data = result.data;

    return {
      output: {
        email: data.email ?? ctx.input.email,
        status: data.status ?? 'unknown',
        score: data.score ?? null,
        regexp: data.regexp ?? null,
        gibberish: data.gibberish ?? null,
        disposable: data.disposable ?? null,
        webmail: data.webmail ?? null,
        mxRecords: data.mx_records ?? null,
        smtpServer: data.smtp_server ?? null,
        smtpCheck: data.smtp_check ?? null,
        acceptAll: data.accept_all ?? null
      },
      message: `Email **${ctx.input.email}** verification result: **${data.status ?? 'unknown'}** (score: ${data.score ?? 'N/A'}).`
    };
  })
  .build();
