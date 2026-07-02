import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSslTests = SlateTool.create(spec, {
  name: 'List SSL Tests',
  key: 'list_ssl_tests',
  description: `List all SSL certificate monitoring checks on your StatusCake account. Returns check configuration including URL, check rate, alert settings, certificate status, and expiry information.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      limit: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      tests: z.array(z.record(z.string(), z.any())).describe('List of SSL test objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listSslTests({
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let tests = result?.data ?? [];

    return {
      output: { tests },
      message: `Found **${tests.length}** SSL test(s).`
    };
  })
  .build();
