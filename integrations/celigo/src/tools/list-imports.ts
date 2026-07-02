import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listImports = SlateTool.create(spec, {
  name: 'List Imports',
  key: 'list_imports',
  description: `Retrieve all imports in your Celigo account. Imports are used to insert data into an application and can run standalone or within a flow.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      imports: z
        .array(
          z.object({
            importId: z.string().describe('Unique import identifier'),
            name: z.string().optional().describe('Import name'),
            lastModified: z.string().optional().describe('Last modification timestamp'),
            connectionId: z.string().optional().describe('Associated connection ID')
          })
        )
        .describe('List of imports')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let imports = await client.listImports();

    let mapped = imports.map((i: any) => ({
      importId: i._id,
      name: i.name,
      lastModified: i.lastModified,
      connectionId: i._connectionId
    }));

    return {
      output: { imports: mapped },
      message: `Found **${mapped.length}** import(s).`
    };
  })
  .build();
