import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let unprotectValue = SlateTool.create(spec, {
  name: 'Unprotect Value',
  key: 'unprotect_value',
  description: 'Decrypt a single string previously protected by the same AnonyFlow account.',
  instructions: ['Use protect_value output.value as encryptedValue.'],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      encryptedValue: z
        .string()
        .describe('The encrypted string from protect_value output.value.')
    })
  )
  .output(
    z.object({
      value: z.string().describe('The original decrypted string.'),
      response: z.record(z.string(), z.unknown()).describe('Full AnonyFlow API response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deanonymizeValue(ctx.input.encryptedValue);
    return {
      output: { value: result.value, response: result },
      message: 'Received the decrypted value.'
    };
  })
  .build();
