import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let protectData = SlateTool.create(spec, {
  name: 'Protect Data',
  key: 'protect_data',
  description: `Encrypt fields within a data object using AnonyFlow. Select field names with keys, or use an empty keys array to protect the entire object. Returns the full API response and the processed object in values.`,
  instructions: [
    'Provide the full data object and specify which field names should be anonymized via the keys parameter.',
    'A non-empty keys array selects fields; an empty keys array protects the entire object.',
    'Pass output.values to unprotect_data as protectedFields. The legacy protectedFields output contains the full API response, with the processed object under value.'
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
          'Field names to encrypt. An empty array protects every field in the data object.'
        )
    })
  )
  .output(
    z.object({
      protectedFields: z
        .record(z.string(), z.unknown())
        .describe(
          'Full AnonyFlow API response, including status and the encrypted object under value.'
        ),
      values: z.record(z.string(), z.unknown()).describe('The encrypted data object.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.anonymizePacket(ctx.input.fields, ctx.input.keys);

    return {
      output: {
        protectedFields: result,
        values: result.value
      },
      message: ctx.input.keys.length
        ? `Received the protected data for ${ctx.input.keys.length} selected field(s).`
        : 'Received the protected data for the entire object.'
    };
  })
  .build();
