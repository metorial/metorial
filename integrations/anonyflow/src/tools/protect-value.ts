import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let protectValue = SlateTool.create(spec, {
  name: 'Protect Value',
  key: 'protect_value',
  description: `Encrypt and anonymize a single sensitive value using AnonyFlow's encryption service. Ideal for quick anonymization of individual data points like a name, email address, phone number, or SSN without needing to construct a full data object.`,
  instructions: [
    'Provide a single string value to be encrypted.',
    'Pass output.value to unprotect_value. The legacy encryptedValue output contains the full API response.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sensitiveValue: z
        .string()
        .describe(
          'The sensitive value to encrypt/anonymize (e.g., a name, email, phone number, SSN).'
        )
    })
  )
  .output(
    z.object({
      encryptedValue: z
        .unknown()
        .describe('Full AnonyFlow API response, with the encrypted string under value.'),
      value: z.string().describe('The encrypted string to pass to unprotect_value.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.anonymizeValue(ctx.input.sensitiveValue);

    return {
      output: {
        encryptedValue: result,
        value: result.value
      },
      message: `Successfully encrypted the provided sensitive value.`
    };
  })
  .build();
