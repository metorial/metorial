import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createBulkSearch = SlateTool.create(spec, {
  name: 'Create Bulk Search',
  key: 'create_bulk_search',
  description: `Launch a bulk search for email discovery, email verification, or domain scanning. Processes up to 5,000 items in parallel. Returns a file ID to retrieve results later using **Get Bulk Search Results**.

For **email-search**: each row should be \`[firstname, lastname, domainOrCompany]\` (at least one of firstname/lastname required).
For **email-verification**: each row should be \`[email]\`.
For **domain-search**: each row should be \`[domainOrCompany]\`.`,
  constraints: ['Maximum 5,000 items per bulk search.'],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Name for the bulk search'),
      task: z
        .enum(['email-search', 'email-verification', 'domain-search'])
        .describe('Type of bulk search to perform'),
      rows: z
        .array(z.array(z.string()))
        .describe('Array of rows to process. Format depends on task type.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the bulk search was created'),
      fileId: z.string().optional().describe('File ID to retrieve results later'),
      raw: z.any().optional().describe('Full response from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createBulkSearch({
      name: ctx.input.name,
      task: ctx.input.task,
      data: ctx.input.rows
    });

    return {
      output: {
        success: result.success ?? true,
        fileId: result._id || result.id || result.fileId,
        raw: result
      },
      message:
        result.success !== false
          ? `Bulk **${ctx.input.task}** search created with **${ctx.input.rows.length}** items. File ID: \`${result._id || result.id || result.fileId}\``
          : `Bulk search creation failed: ${JSON.stringify(result)}`
    };
  })
  .build();
