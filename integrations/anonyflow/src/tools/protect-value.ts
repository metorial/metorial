import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let protectValue = SlateTool.create(spec, {
  name: 'Protect Value',
  key: 'protect_value',
  description: `Encrypt and anonymize a single sensitive value using AnonyFlow's encryption service. Ideal for quick anonymization of individual data points like a name, email address, phone number, or SSN without needing to construct a full data object.`,
  instructions: ['Provide a single string value to be encrypted.'],
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
        .describe('The encrypted/anonymized representation of the input value.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.anonymizeValue(ctx.input.sensitiveValue);

    return {
      output: {
        encryptedValue: result
      },
      message: `Successfully encrypted the provided sensitive value.`
    };
  })
  .build();
