import { SlateTool } from 'slates';
import { z } from 'zod';
import { Msg91Client } from '../lib/client';
import { spec } from '../spec';

export let validateEmail = SlateTool.create(spec, {
  name: 'Validate Email',
  key: 'validate_email',
  description: `Validate an email address to check if it exists, is properly formatted, and is deliverable. Useful for cleaning email lists before sending campaigns.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address to validate')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Validation result with deliverability details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Msg91Client({ token: ctx.auth.token });

    let result = await client.validateEmail({ email: ctx.input.email });

    return {
      output: {
        result
      },
      message: `Email validation result for **${ctx.input.email}**: ${JSON.stringify(result)}`
    };
  })
  .build();
