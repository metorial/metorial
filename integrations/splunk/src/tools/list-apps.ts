import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSplunkClient } from '../lib/helpers';
import { spec } from '../spec';

export let listApps = SlateTool.create(spec, {
  name: 'List Apps',
  key: 'list_apps',
  description: `List installed local Splunk apps. Returns app name, label, version, visibility, disabled status, author, and description so users can discover valid app namespaces for searches, saved searches, and KV Store operations.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      count: z.number().optional().describe('Number of apps to return (default 30)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)')
    })
  )
  .output(
    z.object({
      apps: z.array(
        z.object({
          name: z.string().optional(),
          label: z.string().optional(),
          version: z.string().optional(),
          description: z.string().optional(),
          visible: z.any().optional(),
          disabled: z.any().optional(),
          author: z.string().optional()
        })
      ),
      total: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = createSplunkClient(ctx);
    let response = await client.listApps({
      count: ctx.input.count,
      offset: ctx.input.offset
    });

    return {
      output: response,
      message: `Found **${response.total}** Splunk apps. Returned **${response.apps.length}**.`
    };
  })
  .build();
