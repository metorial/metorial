import { SlateTool } from 'slates';
import { z } from 'zod';
import { AddressZenClient } from '../lib/client';
import { spec } from '../spec';

export let validateEmail = SlateTool.create(spec, {
  name: 'Validate Email',
  key: 'validate_email',
  description: `Validate an email address for correctness and deliverability. Checks the email format, domain, and mailbox to determine if the email address is valid and can receive messages.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address to validate (e.g., "user@example.com")')
    })
  )
  .output(
    z.object({
      valid: z.boolean().optional().describe('Whether the email address is valid'),
      email: z.string().optional().describe('The validated email address'),
      disposable: z
        .boolean()
        .optional()
        .describe('Whether the email uses a disposable email provider'),
      reachable: z.string().optional().describe('Email reachability status'),
      roleAccount: z
        .boolean()
        .optional()
        .describe('Whether this is a role-based email address (e.g., admin@, info@)'),
      freeProvider: z
        .boolean()
        .optional()
        .describe('Whether the email uses a free email provider (e.g., Gmail, Yahoo)'),
      domain: z.string().optional().describe('Email domain'),
      suggestion: z.string().optional().describe('Suggested correction if a typo is detected'),
      code: z.number().optional().describe('API response code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AddressZenClient({ token: ctx.auth.token });

    let result = await client.validateEmail(ctx.input.email);
    let r = result.result || {};

    let output = {
      valid: r.valid,
      email: r.email || ctx.input.email,
      disposable: r.disposable,
      reachable: r.reachable,
      roleAccount: r.role_account ?? r.role,
      freeProvider: r.free_provider ?? r.free,
      domain: r.domain,
      suggestion: r.suggestion,
      code: result.code
    };

    let validStatus =
      output.valid === true ? 'valid' : output.valid === false ? 'invalid' : 'unknown';

    return {
      output,
      message: `Email **${ctx.input.email}** is **${validStatus}**.${output.suggestion ? ` Did you mean: ${output.suggestion}?` : ''}`
    };
  })
  .build();
