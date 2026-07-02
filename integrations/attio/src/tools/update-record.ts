import { SlateTool } from 'slates';
import { z } from 'zod';
import { AttioClient } from '../lib/client';
import { spec } from '../spec';

export let updateRecordTool = SlateTool.create(spec, {
  name: 'Update Record',
  key: 'update_record',
  description: `Update an existing record's attribute values. By default, multi-select values are appended. Set **overwriteMultiselect** to true to replace multi-select values entirely.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      objectSlug: z
        .string()
        .describe('Object type slug or ID (e.g. "people", "companies", "deals")'),
      recordId: z.string().describe('The record ID to update'),
      values: z
        .record(z.string(), z.any())
        .describe('Attribute values to update, keyed by attribute slug'),
      overwriteMultiselect: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, replaces multi-select values instead of appending')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('The record ID'),
      objectId: z.string().describe('The object ID'),
      createdAt: z.string().describe('When the record was created'),
      webUrl: z.string().optional().describe('URL to view the record in Attio'),
      values: z.record(z.string(), z.any()).describe('Updated record attribute values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AttioClient({ token: ctx.auth.token });

    let record = await client.updateRecord(
      ctx.input.objectSlug,
      ctx.input.recordId,
      ctx.input.values,
      ctx.input.overwriteMultiselect
    );

    let output = {
      recordId: record.id?.record_id ?? '',
      objectId: record.id?.object_id ?? '',
      createdAt: record.created_at ?? '',
      webUrl: record.web_url,
      values: record.values ?? {}
    };

    return {
      output,
      message: `Updated record **${output.recordId}** in **${ctx.input.objectSlug}**.`
    };
  })
  .build();
