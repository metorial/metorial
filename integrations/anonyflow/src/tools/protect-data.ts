import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let protectData = SlateTool.create(spec, {
  name: 'Protect Data',
  key: 'protect_data',
  description: `Encrypt and anonymize specific fields within a data object using AnonyFlow's encryption service. Specify which fields to protect using the **keys** parameter — only those fields will be encrypted while the rest remain untouched. Useful for protecting PII such as names, emails, phone numbers, and addresses before storing or sharing data.`,
  instructions: [
    'Provide the full data object and specify which field names should be anonymized via the keys parameter.',
    'Only the fields listed in keys will be encrypted; all other fields remain unchanged.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fields: z
        .record(z.string(), z.unknown())
        .describe(
          'The data object containing the values to be protected. All fields that should be anonymized must be present here.'
        ),
      keys: z
        .array(z.string())
        .describe(
          'Array of field names within the data object that should be encrypted/anonymized.'
        )
    })
  )
  .output(
    z.object({
      protectedFields: z
        .record(z.string(), z.unknown())
        .describe(
          'The data object with specified fields encrypted. Unspecified fields remain unchanged.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.anonymizePacket(ctx.input.fields, ctx.input.keys);

    return {
      output: {
        protectedFields: result as Record<string, unknown>
      },
      message: `Successfully protected ${ctx.input.keys.length} field(s): **${ctx.input.keys.join(', ')}**`
    };
  })
  .build();
