import { SlateTool } from 'slates';
import { z } from 'zod';
import { AttioClient } from '../lib/client';
import { spec } from '../spec';

export let createRecordTool = SlateTool.create(spec, {
  name: 'Create or Update Record',
  key: 'create_or_update_record',
  description: `Create a new record or update an existing one (upsert) in any Attio object. When **matchingAttribute** is provided, performs an "assert" (upsert): if a record with that attribute value exists, it's updated; otherwise a new record is created. Without matchingAttribute, always creates a new record.`,
  instructions: [
    'Provide attribute values as a JSON object keyed by attribute slug. Values should match the attribute type (e.g. string for text, number for numbers, email string for email_addresses).',
    'To upsert, set matchingAttribute to a unique attribute slug like "email_addresses" or "domains".'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      objectSlug: z
        .string()
        .describe('Object type slug or ID (e.g. "people", "companies", "deals")'),
      values: z
        .record(z.string(), z.any())
        .describe('Attribute values keyed by attribute slug'),
      matchingAttribute: z
        .string()
        .optional()
        .describe(
          'Attribute slug to match on for upsert behavior. If provided, the record is created or updated based on this attribute.'
        )
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('The record ID'),
      objectId: z.string().describe('The object ID'),
      createdAt: z.string().describe('When the record was created'),
      webUrl: z.string().optional().describe('URL to view the record in Attio'),
      values: z.record(z.string(), z.any()).describe('Record attribute values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AttioClient({ token: ctx.auth.token });

    let record: any;
    if (ctx.input.matchingAttribute) {
      record = await client.assertRecord(
        ctx.input.objectSlug,
        ctx.input.matchingAttribute,
        ctx.input.values
      );
    } else {
      record = await client.createRecord(ctx.input.objectSlug, ctx.input.values);
    }

    let output = {
      recordId: record.id?.record_id ?? '',
      objectId: record.id?.object_id ?? '',
      createdAt: record.created_at ?? '',
      webUrl: record.web_url,
      values: record.values ?? {}
    };

    let action = ctx.input.matchingAttribute ? 'Created or updated' : 'Created';
    return {
      output,
      message: `${action} record **${output.recordId}** in **${ctx.input.objectSlug}**.`
    };
  })
  .build();
