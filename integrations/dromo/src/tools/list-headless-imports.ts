import { SlateTool } from 'slates';
import { z } from 'zod';
import { DromoClient } from '../lib/client';
import { spec } from '../spec';

export let listHeadlessImports = SlateTool.create(spec, {
  name: 'List Headless Imports',
  key: 'list_headless_imports',
  description: `Lists a page of headless imports in your Dromo account, including status, schema, filename, creation date, and pagination information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z
        .number()
        .refine(Number.isInteger)
        .min(0)
        .optional()
        .describe('Starting import index; defaults to 0'),
      limit: z
        .number()
        .refine(Number.isInteger)
        .min(1)
        .max(1000)
        .optional()
        .describe('Number of imports per page; defaults to 100, maximum 1000')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total matching headless import count'),
      next: z.string().nullable().describe('Next page URL, or null for the last page'),
      previous: z
        .string()
        .nullable()
        .describe('Previous page URL, or null for the first page'),
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
    let page = await client.listHeadlessImports(ctx.input);

    let mapped = page.results.map(i => ({
      importId: i.id,
      schemaId: i.schema_id,
      originalFilename: i.original_filename ?? '',
      status: i.status,
      createdDate: i.created_date,
      numDataRows: i.num_data_rows
    }));

    return {
      output: { imports: mapped, count: page.count, next: page.next, previous: page.previous },
      message: `Found **${mapped.length}** headless import(s).`
    };
  })
  .build();
