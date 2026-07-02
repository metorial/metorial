import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubcategories = SlateTool.create(spec, {
  name: 'List Subcategories',
  key: 'list_subcategories',
  description: `Retrieve all subcategories (tags/segments) available in your Enginemailer account. Subcategories are used to segment subscribers for targeted campaigns and tagging.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      status: z.string().describe('Response status'),
      statusCode: z.string().describe('Response status code'),
      subcategories: z.any().optional().describe('List of subcategories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getSubcategories();

    return {
      output: {
        status: result.Result?.Status ?? 'Unknown',
        statusCode: result.Result?.StatusCode ?? 'Unknown',
        subcategories: result.Result?.Data
      },
      message: `Retrieved subcategories.`
    };
  })
  .build();
