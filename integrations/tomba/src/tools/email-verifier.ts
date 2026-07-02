import { SlateTool } from 'slates';
import { z } from 'zod';
import { TombaClient } from '../lib/client';
import { spec } from '../spec';

export let emailVerifier = SlateTool.create(spec, {
  name: 'Email Verifier',
  key: 'email_verifier',
  description: `Verify whether an email address is deliverable. Returns detailed validation checks including SMTP, MX records, disposable/webmail detection, and a confidence score.`,
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
      email: z.string().describe('The verified email address'),
      result: z.string().nullable().optional().describe('Verification result'),
      status: z.string().nullable().optional().describe('Email status'),
      score: z
        .number()
        .nullable()
        .optional()
        .describe('Verification confidence score (0-100)'),
      smtpProvider: z.string().nullable().optional().describe('SMTP provider'),
      mxRecords: z.array(z.string()).optional().describe('MX records'),
      mxCheck: z.boolean().nullable().optional().describe('Whether MX records exist'),
      smtpServer: z.boolean().nullable().optional().describe('Whether SMTP server exists'),
      smtpCheck: z.boolean().nullable().optional().describe('Whether SMTP check passed'),
      acceptAll: z
        .boolean()
        .nullable()
        .optional()
        .describe('Whether domain accepts all emails'),
      greylisted: z
        .boolean()
        .nullable()
        .optional()
        .describe('Whether the email is greylisted'),
      block: z.boolean().nullable().optional().describe('Whether the email is blocked'),
      gibberish: z
        .boolean()
        .nullable()
        .optional()
        .describe('Whether the email appears to be gibberish'),
      disposable: z
        .boolean()
        .nullable()
        .optional()
        .describe('Whether the email is from a disposable domain'),
      webmail: z
        .boolean()
        .nullable()
        .optional()
        .describe('Whether the email is a webmail address'),
      regex: z
        .boolean()
        .nullable()
        .optional()
        .describe('Whether the email passes regex validation'),
      whoisRegistrar: z.string().nullable().optional().describe('Domain registrar name'),
      whoisCreatedDate: z.string().nullable().optional().describe('Domain creation date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TombaClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.emailVerifier(ctx.input.email);

    let emailData = result.data?.email || {};

    return {
      output: {
        email: emailData.email || ctx.input.email,
        result: emailData.result,
        status: emailData.status,
        score: emailData.score,
        smtpProvider: emailData.smtp_provider,
        mxRecords: emailData.mx?.records || [],
        mxCheck: emailData.mx_check,
        smtpServer: emailData.smtp_server,
        smtpCheck: emailData.smtp_check,
        acceptAll: emailData.accept_all,
        greylisted: emailData.greylisted,
        block: emailData.block,
        gibberish: emailData.gibberish,
        disposable: emailData.disposable,
        webmail: emailData.webmail,
        regex: emailData.regex,
        whoisRegistrar: emailData.whois?.registrar_name,
        whoisCreatedDate: emailData.whois?.created_date
      },
      message: `Email **${ctx.input.email}** verification result: **${emailData.result || 'unknown'}** (status: ${emailData.status || 'unknown'}, score: ${emailData.score ?? 'N/A'}).`
    };
  })
  .build();
