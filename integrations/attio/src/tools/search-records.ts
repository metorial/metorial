import { SlateTool } from 'slates';
import { z } from 'zod';
import { AttioClient } from '../lib/client';
import { spec } from '../spec';

export let searchRecordsTool = SlateTool.create(spec, {
  name: 'Search Records',
  key: 'search_records',
  description: `Fuzzy search across records in one or more objects. Matches on names, domains, emails, phone numbers, social handles, and labels. Good for finding records when you have partial or approximate information.`,
  constraints: [
    'Results are eventually consistent and may not include very recently created records.',
    'Maximum 25 results per search.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query text'),
      objects: z
        .array(z.string())
        .min(1)
        .describe('Object slugs or IDs to search (e.g. ["people", "companies"])'),
      limit: z.number().optional().default(25).describe('Maximum results (max 25)')
    })
  )
  .output(
    z.object({
      records: z
        .array(
          z.object({
            recordId: z.string().describe('The record ID'),
            objectId: z.string().describe('The object ID'),
            createdAt: z.string().describe('When the record was created'),
            webUrl: z.string().optional().describe('URL to view the record in Attio'),
            values: z.record(z.string(), z.any()).describe('Record attribute values')
          })
        )
        .describe('Matching records'),
      count: z.number().describe('Number of records returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AttioClient({ token: ctx.auth.token });

    let records = await client.searchRecords(ctx.input.query, {
      objects: ctx.input.objects,
      limit: ctx.input.limit
    });

    let mapped = records.map((r: any) => ({
      recordId: r.id?.record_id ?? '',
      objectId: r.id?.object_id ?? '',
      createdAt: r.created_at ?? '',
      webUrl: r.web_url,
      values: r.values ?? {}
    }));

    return {
      output: {
        records: mapped,
        count: mapped.length
      },
      message: `Found **${mapped.length}** record(s) matching "${ctx.input.query}".`
    };
  })
  .build();
