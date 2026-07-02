import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailgunClient } from '../lib/client';
import { spec } from '../spec';

export let validateEmail = SlateTool.create(spec, {
  name: 'Validate Email',
  key: 'validate_email',
  description: `Validate an email address in real-time using Mailgun's Email Validation API. Checks if the address is deliverable, identifies disposable and role-based addresses, and provides a risk assessment.`,
  constraints: ['Email Validation is a separate paid feature in Mailgun.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      address: z.string().describe('Email address to validate')
    })
  )
  .output(
    z.object({
      address: z.string().describe('The validated email address'),
      result: z.string().describe('Validation result: deliverable, undeliverable, or unknown'),
      risk: z.string().describe('Risk level: high, medium, low, or unknown'),
      isDisposableAddress: z
        .boolean()
        .describe('Whether the address is from a known disposable email provider'),
      isRoleAddress: z
        .boolean()
        .describe('Whether the address is a role-based address (e.g. admin@, support@)'),
      reasons: z.array(z.string()).describe('Reasons for the validation result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.validateEmail(ctx.input.address);

    return {
      output: {
        address: result.address,
        result: result.result,
        risk: result.risk,
        isDisposableAddress: result.is_disposable_address,
        isRoleAddress: result.is_role_address,
        reasons: result.reason
      },
      message: `**${result.address}** is **${result.result}** (risk: ${result.risk}).`
    };
  })
  .build();
