import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let unprotectData = SlateTool.create(spec, {
  name: 'Unprotect Data',
  key: 'unprotect_data',
  description: `Decrypt and deanonymize previously protected fields within a data object using AnonyFlow's decryption service. Specify which fields to decrypt using the **keys** parameter. Only authorized users with access to the same AnonyFlow account can deanonymize the data.`,
  instructions: [
    'Provide the full data object containing encrypted fields and specify which field names should be decrypted via the keys parameter.',
    'Only the fields listed in keys will be decrypted; all other fields remain unchanged.'
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
        .describe('The data object containing previously encrypted/anonymized values.'),
      keys: z
        .array(z.string())
        .describe(
          'Array of field names within the data object that should be decrypted/deanonymized.'
        )
    })
  )
  .output(
    z.object({
      fields: z
        .record(z.string(), z.unknown())
        .describe(
          'The data object with specified fields decrypted back to their original values.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deanonymizePacket(ctx.input.protectedFields, ctx.input.keys);

    return {
      output: {
        fields: result as Record<string, unknown>
      },
      message: `Successfully unprotected ${ctx.input.keys.length} field(s): **${ctx.input.keys.join(', ')}**`
    };
  })
  .build();
