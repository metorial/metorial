import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let expireHostedDocument = SlateTool.create(spec, {
  name: 'Expire Hosted Document',
  key: 'expire_hosted_document',
  description: `Manually expires a hosted document, making it immediately inaccessible at its public URL. Use this to revoke access to a previously hosted document before its scheduled expiration date or download limit is reached.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      downloadId: z
        .string()
        .describe(
          'The download ID of the hosted document to expire, as returned when the document was created.'
        )
    })
  )
  .output(
    z.object({
      expired: z.boolean().describe('Whether the document was successfully expired.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.expireHostedDocument(ctx.input.downloadId);

    return {
      output: {
        expired: true
      },
      message: `Hosted document **${ctx.input.downloadId}** has been expired and is no longer accessible.`
    };
  })
  .build();
