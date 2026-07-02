import { SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let validateSender = SlateTool.create(spec, {
  name: 'Validate Sender Email',
  key: 'validate_sender',
  description: `Request verification of a sender email address or retrieve the list of already verified sender emails. Verified addresses are required to send emails through Unisender.`
})
  .input(
    z.object({
      action: z
        .enum(['validate', 'list'])
        .describe('"validate" to verify a new email, "list" to get already verified emails'),
      email: z
        .string()
        .optional()
        .describe('Email address to validate (required for validate action)')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Validation result or list of verified emails')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({
      token: ctx.auth.token,
      locale: ctx.config.locale
    });

    if (ctx.input.action === 'validate') {
      if (!ctx.input.email) throw new Error('email is required for validate action');
      let result = await client.validateSender(ctx.input.email);
      return {
        output: { result },
        message: `Sent verification request for **${ctx.input.email}**`
      };
    }

    let result = await client.getCheckedEmail();
    return {
      output: { result },
      message: `Retrieved list of verified sender emails`
    };
  })
  .build();
