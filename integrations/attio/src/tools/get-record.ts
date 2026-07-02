import { SlateTool } from 'slates';
import { z } from 'zod';
import { AttioClient } from '../lib/client';
import { spec } from '../spec';

export let getRecordTool = SlateTool.create(spec, {
  name: 'Get Record',
  key: 'get_record',
  description: `Retrieve a single record from any Attio object (People, Companies, Deals, or custom objects) by its ID. Returns the full record with all attribute values.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objectSlug: z
        .string()
        .describe('Object type slug or ID (e.g. "people", "companies", "deals")'),
      recordId: z.string().describe('The record ID to retrieve')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('The record ID'),
      objectId: z.string().describe('The object ID this record belongs to'),
      createdAt: z.string().describe('When the record was created'),
      webUrl: z.string().optional().describe('URL to view the record in Attio'),
      values: z
        .record(z.string(), z.any())
        .describe('Record attribute values keyed by attribute slug')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AttioClient({ token: ctx.auth.token });
    let record = await client.getRecord(ctx.input.objectSlug, ctx.input.recordId);

    let output = {
      recordId: record.id?.record_id ?? '',
      objectId: record.id?.object_id ?? '',
      createdAt: record.created_at ?? '',
      webUrl: record.web_url,
      values: record.values ?? {}
    };

    return {
      output,
      message: `Retrieved record **${output.recordId}** from **${ctx.input.objectSlug}**.`
    };
  })
  .build();
