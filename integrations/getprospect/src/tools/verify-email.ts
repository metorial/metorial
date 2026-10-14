import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyEmail = SlateTool.create(spec, {
  name: 'Verify Email',
  key: 'verify_email',
  description: `Verify the deliverability of an email address. Returns the verification status indicating whether the email is valid, invalid, or unknown. Useful for cleaning contact lists before outreach.`,
  constraints: [
    'Valid or invalid verdicts cost one verification credit per address per workspace. Accept-all and unknown verdicts and syntactically invalid addresses are free.',
    'A live verification can take up to 75 seconds.'
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
      email: z.string().optional().describe('The verified email address'),
      status: z
        .string()
        .optional()
        .describe(
          'Mailbox verification status (e.g. "valid", "invalid", "accept_all", "unknown")'
        ),
      domain: z.string().optional().describe('Email domain'),
      domainStatus: z
        .string()
        .optional()
        .describe('Domain health, separate from mailbox status'),
      smtpProvider: z.string().optional().describe('Mail provider'),
      freeEmail: z
        .boolean()
        .optional()
        .describe('Whether the address uses a free email provider')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.verifyEmail(ctx.input.email);

    return {
      output: {
        email: result.email ?? ctx.input.email,
        status: result.status,
        domain: result.domain ?? undefined,
        domainStatus: result.domain_status ?? undefined,
        smtpProvider: result.smtp_provider ?? undefined,
        freeEmail: result.free_email ?? undefined
      },
      message: `Email **${ctx.input.email}** verification result: **${result.status ?? 'unknown'}**.`
    };
  })
  .build();
