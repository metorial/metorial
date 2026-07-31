import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validateIncludeSummary, validateObjectLocator } from '../lib/validation';
import { spec } from '../spec';

let inputSchema = z.object({
  objectType: z
    .string()
    .trim()
    .min(1)
    .describe('Object type slug such as "contacts", "companies", or a custom object slug'),
  objectId: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Record ID to fetch. Provide exactly one of objectId or email.'),
  email: z
    .string()
    .email()
    .optional()
    .describe(
      'Contact email to look up. Supported only for contact or contacts; provide exactly one of objectId or email.'
    ),
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
    validateObjectLocator(ctx.input.objectType, {
      objectId: ctx.input.objectId,
      email: ctx.input.email
    });
    validateIncludeSummary(ctx.input.objectType, ctx.input.includeSummary);
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
