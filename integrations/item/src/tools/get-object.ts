import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let inputSchema = z
  .object({
    objectType: z
      .string()
      .describe('Object type slug such as "contacts", "companies", or a custom object slug'),
    objectId: z.number().int().optional().describe('Record ID to fetch'),
    email: z.string().email().optional().describe('Contact email to look up instead of an ID'),
    includeAllFields: z
      .boolean()
      .optional()
      .default(false)
      .describe('Include all system fields in the response'),
    includeSummary: z
      .boolean()
      .optional()
      .default(false)
      .describe('Include the AI summary for contacts or companies when available')
  })
  .refine(value => value.objectId !== undefined || !!value.email, {
    message: 'Provide either objectId or email.',
    path: ['objectId']
  });

export let getObject = SlateTool.create(spec, {
  name: 'Get Object',
  key: 'get_object',
  description:
    'Fetch a single item record by ID, or by email for contacts. Useful for retrieving the full flattened record with all available fields.',
  tags: {
    readOnly: true
  }
})
  .input(inputSchema)
  .output(
    z.object({
      objectRecord: z.record(z.string(), z.any()).describe('The requested item record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let objectRecord = await client.getObject(ctx.input.objectType, {
      objectId: ctx.input.objectId,
      email: ctx.input.email,
      includeAllFields: ctx.input.includeAllFields,
      includeSummary: ctx.input.includeSummary
    });

    return {
      output: {
        objectRecord
      },
      message: `Retrieved one record from **${ctx.input.objectType}**.`
    };
  })
  .build();
