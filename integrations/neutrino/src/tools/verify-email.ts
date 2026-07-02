import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeutrinoClient } from '../lib/client';
import { spec } from '../spec';

export let verifyEmailTool = SlateTool.create(spec, {
  name: 'Verify Email (SMTP)',
  key: 'verify_email',
  description: `Perform deep SMTP-based email verification to confirm whether a mailbox actually exists and can receive mail. Goes beyond syntax/DNS validation to simulate delivery. Use this for high-confidence email verification.`,
  constraints: [
    'May take 2-5 seconds, up to 60 seconds for slow mail servers',
    'Rate limited to 2 requests per second'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address to verify'),
      fixTypos: z
        .boolean()
        .optional()
        .describe('Automatically attempt to fix typos in the address')
    })
  )
  .output(
    z.object({
      valid: z.boolean().describe('Whether the email address is valid and verified'),
      verified: z.boolean().describe('Whether SMTP verification confirmed the mailbox exists'),
      email: z
        .string()
        .describe('The email address (may be corrected if fixTypos was enabled)'),
      domain: z.string().describe('The email domain'),
      provider: z.string().describe('The email hosting provider'),
      isFreemail: z.boolean().describe('Whether this is a free email provider'),
      isDisposable: z.boolean().describe('Whether this is a disposable/temporary email'),
      isPersonal: z.boolean().describe('Whether this appears to be a personal email address'),
      isCatchAll: z.boolean().describe('Whether the domain uses a catch-all policy'),
      smtpStatus: z.string().describe('SMTP verification status code'),
      smtpResponse: z.string().describe('Raw SMTP server response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeutrinoClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.emailVerify({
      email: ctx.input.email,
      fixTypos: ctx.input.fixTypos
    });

    return {
      output: {
        valid: result.valid,
        verified: result.verified,
        email: result.email,
        domain: result.domain,
        provider: result.provider ?? '',
        isFreemail: result.isFreemail,
        isDisposable: result.isDisposable,
        isPersonal: result.isPersonal,
        isCatchAll: result.isCatchAll,
        smtpStatus: result.smtpStatus ?? '',
        smtpResponse: result.smtpResponse ?? ''
      },
      message: result.verified
        ? `**${result.email}** is verified — the mailbox exists and can receive mail.${result.isCatchAll ? ' Note: domain uses catch-all policy.' : ''}`
        : `**${ctx.input.email}** could not be verified via SMTP. Status: ${result.smtpStatus || 'unknown'}.`
    };
  })
  .build();
