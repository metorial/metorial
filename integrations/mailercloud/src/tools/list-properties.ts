import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProperties = SlateTool.create(spec, {
  name: 'List Contact Properties',
  key: 'list_properties',
  description: `Retrieve all contact properties (both standard and custom) from your Mailercloud account. Properties define the fields available for contacts and can be used for segmentation.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z
      .object({
        properties: z
          .array(z.record(z.string(), z.unknown()))
          .describe('List of contact properties')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listProperties();

    let data = result?.data ?? result;
    let properties = Array.isArray(data) ? data : (data?.properties ?? data?.data ?? []);

    return {
      output: {
        properties
      },
      message: `Retrieved **${properties.length}** contact properties.`
    };
  })
  .build();
