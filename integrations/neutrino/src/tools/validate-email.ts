import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeutrinoClient } from '../lib/client';
import { spec } from '../spec';

export let validateEmailTool = SlateTool.create(spec, {
  name: 'Validate Email',
  key: 'validate_email',
  description: `Validate an email address by checking syntax, DNS, MX records, and detecting disposable/freemail providers. Can auto-fix common typos in email addresses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address to validate'),
      fixTypos: z
        .boolean()
        .optional()
        .describe('Automatically attempt to fix typos in the address')
    })
  )
  .output(
    z.object({
      valid: z.boolean().describe('Whether the email address is valid'),
      email: z
        .string()
        .describe('The email address (may be corrected if fixTypos was enabled)'),
      domain: z.string().describe('The email domain'),
      provider: z.string().describe('The email provider name'),
      isFreemail: z.boolean().describe('Whether this is a free email provider'),
      isDisposable: z.boolean().describe('Whether this is a disposable/temporary email'),
      isPersonal: z.boolean().describe('Whether this appears to be a personal email address'),
      typosFixed: z.boolean().describe('Whether typos were corrected'),
      syntaxError: z.boolean().describe('Whether the email has a syntax error'),
      domainError: z.boolean().describe('Whether the domain has an error'),
      domainStatus: z
        .string()
        .describe(
          'Domain status: ok, invalid, no-service, no-mail, mx-invalid, mx-bogon, or resolv-error'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeutrinoClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.emailValidate({
      email: ctx.input.email,
      fixTypos: ctx.input.fixTypos
    });

    return {
      output: {
        valid: result.valid,
        email: result.email,
        domain: result.domain,
        provider: result.provider,
        isFreemail: result.isFreemail,
        isDisposable: result.isDisposable,
        isPersonal: result.isPersonal,
        typosFixed: result.typosFixed,
        syntaxError: result.syntaxError,
        domainError: result.domainError,
        domainStatus: result.domainStatus
      },
      message: result.valid
        ? `**${result.email}** is a valid email address (domain: ${result.domain}, provider: ${result.provider || 'unknown'}).${result.isDisposable ? ' ⚠️ Disposable email detected.' : ''}${result.isFreemail ? ' Free email provider.' : ''}`
        : `**${ctx.input.email}** is not a valid email address. Domain status: ${result.domainStatus}.${result.syntaxError ? ' Syntax error detected.' : ''}${result.domainError ? ' Domain error detected.' : ''}`
    };
  })
  .build();
