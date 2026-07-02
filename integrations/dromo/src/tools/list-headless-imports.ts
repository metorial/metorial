import { SlateTool } from 'slates';
import { z } from 'zod';
import { DromoClient } from '../lib/client';
import { spec } from '../spec';

export let listHeadlessImports = SlateTool.create(spec, {
  name: 'List Headless Imports',
  key: 'list_headless_imports',
  description: `Lists all headless imports in your Dromo account. Returns an overview of each import including status, schema, filename, and creation date.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      imports: z.array(
        z.object({
          importId: z.string().describe('Unique identifier of the headless import'),
          schemaId: z.string().describe('ID of the schema used'),
          originalFilename: z.string().describe('Original filename'),
          status: z.string().describe('Current status'),
          createdDate: z.string().describe('ISO-8601 creation timestamp'),
          numDataRows: z.number().optional().describe('Number of data rows processed')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new DromoClient({ token: ctx.auth.token });
    let imports = await client.listHeadlessImports();

    let mapped = imports.map(i => ({
      importId: i.id,
      schemaId: i.schema_id,
      originalFilename: i.original_filename,
      status: i.status,
      createdDate: i.created_date,
      numDataRows: i.num_data_rows
    }));

    return {
      output: { imports: mapped },
      message: `Found **${mapped.length}** headless import(s).`
    };
  })
  .build();
