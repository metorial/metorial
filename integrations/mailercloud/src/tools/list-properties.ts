import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getMailercloudCount, getMailercloudItems } from '../lib/responses';
import { spec } from '../spec';

export let listProperties = SlateTool.create(spec, {
  name: 'List Contact Properties',
  key: 'list_properties',
  description: `Retrieve a page of contact properties (both standard and custom) from your Mailercloud account. Properties define the fields available for contacts and can be used for segmentation.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().int().min(1).optional().describe('Page number (default: 1)'),
      limit: z.number().int().min(10).max(100).optional().describe('Page size (default: 100)'),
      search: z.string().optional().describe('Filter contact properties by name')
    })
  )
  .output(
    z
      .object({
        properties: z
          .array(z.record(z.string(), z.unknown()))
          .describe('List of contact properties'),
        totalCount: z.number().optional().describe('Total number of matching properties')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listProperties(ctx.input);

    let data = result?.data ?? result;
    let properties = getMailercloudItems(data?.properties ?? data?.data ?? data);

    return {
      output: {
        properties,
        totalCount: getMailercloudCount(result?.count, properties.length)
      },
      message: `Retrieved **${properties.length}** contact properties.`
    };
  })
  .build();
