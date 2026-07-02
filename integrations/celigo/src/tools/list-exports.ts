import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listExports = SlateTool.create(spec, {
  name: 'List Exports',
  key: 'list_exports',
  description: `Retrieve all exports in your Celigo account. Exports are used to extract data from an application and can run standalone or within a flow.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      exports: z
        .array(
          z.object({
            exportId: z.string().describe('Unique export identifier'),
            name: z.string().optional().describe('Export name'),
            type: z.string().optional().describe('Export type (e.g., webhook, test, delta)'),
            lastModified: z.string().optional().describe('Last modification timestamp'),
            connectionId: z.string().optional().describe('Associated connection ID')
          })
        )
        .describe('List of exports')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let exports = await client.listExports();

    let mapped = exports.map((e: any) => ({
      exportId: e._id,
      name: e.name,
      type: e.type,
      lastModified: e.lastModified,
      connectionId: e._connectionId
    }));

    return {
      output: { exports: mapped },
      message: `Found **${mapped.length}** export(s).`
    };
  })
  .build();
