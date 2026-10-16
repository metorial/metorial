import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let unprotectData = SlateTool.create(spec, {
  name: 'Unprotect Data',
  key: 'unprotect_data',
  description: `Decrypt a data object previously protected by the same AnonyFlow account. Select field names with keys, or use an empty keys array to process every field. Returns the full API response and processed object; a field value of "Error" can indicate a decryption failure.`,
  instructions: [
    'Provide the full data object containing encrypted fields and specify which field names should be decrypted via the keys parameter.',
    'Use protect_data output.values as protectedFields, or the value property from its legacy protectedFields output.',
    'A non-empty keys array selects fields; an empty keys array processes the entire object.',
    'Inspect the returned object. The provider documents the string "Error" for individual field decryption failures; it is preserved unchanged.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      protectedFields: z
        .record(z.string(), z.unknown())
        .describe(
          'The encrypted object from protect_data output.values, without the API response envelope.'
        ),
      keys: z
        .array(z.string())
        .describe(
          'Field names to decrypt. An empty array processes every field in the data object.'
        )
    })
  )
  .output(
    z.object({
      fields: z
        .record(z.string(), z.unknown())
        .describe(
          'Full AnonyFlow API response, including status and the processed object under value.'
        ),
      values: z
        .record(z.string(), z.unknown())
        .describe(
          'The processed object. The string "Error" can indicate a per-field decryption failure.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deanonymizePacket(ctx.input.protectedFields, ctx.input.keys);

    return {
      output: {
        fields: result,
        values: result.value
      },
      message: ctx.input.keys.length
        ? `Received the decryption result for ${ctx.input.keys.length} selected field(s). Inspect values for any per-field failures.`
        : 'Received the decryption result for the entire object. Inspect values for any per-field failures.'
    };
  })
  .build();
