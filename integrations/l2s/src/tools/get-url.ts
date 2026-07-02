import { SlateTool } from 'slates';
import { z } from 'zod';
import { L2sClient } from '../lib/client';
import { spec } from '../spec';

export let getUrl = SlateTool.create(spec, {
  name: 'Get URL Details',
  key: 'get_url',
  description: `Retrieve details of a shortened URL by its ID. Returns the destination URL, custom key, UTM parameters, tags, title, and other metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      urlId: z.string().describe('The ID of the shortened URL to retrieve')
    })
  )
  .output(
    z.object({
      ok: z.boolean().describe('Whether the operation was successful'),
      message: z.string().describe('Status message from the API'),
      urlData: z
        .any()
        .describe(
          'Shortened URL details including destination, key, UTM parameters, tags, and metadata'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new L2sClient({ token: ctx.auth.token });

    let result = await client.getUrl(ctx.input.urlId);

    return {
      output: {
        ok: result.ok,
        message: result.response?.message ?? 'URL details retrieved',
        urlData: result.response?.data
      },
      message: `Retrieved details for URL **${ctx.input.urlId}**.`
    };
  })
  .build();
