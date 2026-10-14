import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let findEmail = SlateTool.create(spec, {
  name: 'Find Email',
  key: 'find_email',
  description: `Find a prospect's verified business email address given a domain, first name, and last name. Newly revealed valid emails consume account credits.`,
  constraints: [
    'A newly found valid email costs one email credit. Not-found results and emails already owned by the workspace are free.',
    'A live lookup can take more than a minute.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Company domain name (e.g. "example.com")'),
      firstName: z.string().describe('First name of the prospect'),
      lastName: z.string().describe('Last name of the prospect')
    })
  )
  .output(
    z.object({
      email: z.string().optional().describe('The found email address'),
      status: z
        .string()
        .optional()
        .describe('Status of the lookup (e.g. "valid", "not_found")'),
      confidence: z.number().optional().describe('Confidence score, when provided'),
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

    let result = await client.findEmail({
      domain: ctx.input.domain,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName
    });

    return {
      output: {
        email: result.email ?? undefined,
        status: result.status,
        confidence: result.confidence,
        domain: result.domain ?? undefined,
        domainStatus: result.domain_status ?? undefined,
        smtpProvider: result.smtp_provider ?? undefined,
        freeEmail: result.free_email ?? undefined
      },
      message: result.email
        ? `Found email **${result.email}** for ${ctx.input.firstName} ${ctx.input.lastName} at ${ctx.input.domain}.`
        : `No email found for ${ctx.input.firstName} ${ctx.input.lastName} at ${ctx.input.domain}.`
    };
  })
  .build();
