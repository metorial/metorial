import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let compareRecordsTool = SlateTool.create(spec, {
  name: 'Compare Records',
  key: 'compare_records',
  description: `Compares structured data records with multiple fields to determine similarity. Each record can contain up to 5 fields of types including name, address, date, number, boolean, and string. Fields can be individually weighted to control their impact on the final match score. Compares left records against right records pairwise.`,
  instructions: [
    'Field types: rni_name, rni_address, rni_date, rni_number, rni_boolean, rni_string.',
    'Only fields with matching names between left and right records are compared.',
    'Use field weights to prioritize certain fields in the matching score.'
  ],
  constraints: ['Maximum of 5 fields per comparison.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fields: z
        .record(
          z.string(),
          z.object({
            type: z
              .string()
              .describe(
                'Field type (rni_name, rni_address, rni_date, rni_number, rni_boolean, rni_string)'
              ),
            weight: z
              .number()
              .optional()
              .describe('Weight for this field in the similarity calculation'),
            scoreIfNull: z
              .number()
              .optional()
              .describe('Score to use when a field is missing from a record')
          })
        )
        .describe('Field definitions mapping field names to their type and weight'),
      leftRecords: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Left-side records to compare'),
      rightRecords: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Right-side records to compare against'),
      includeExplainInfo: z
        .boolean()
        .optional()
        .describe('Include detailed scoring breakdown per field')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            score: z.number().describe('Overall similarity score between 0 and 1'),
            explainInfo: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Per-field scoring details when includeExplainInfo is enabled')
          })
        )
        .describe('Pairwise similarity results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let properties: Record<string, unknown> = {};
    if (ctx.input.includeExplainInfo !== undefined) {
      properties.includeExplainInfo = ctx.input.includeExplainInfo;
    }

    let result = await client.recordSimilarity({
      fields: ctx.input.fields,
      records: {
        left: ctx.input.leftRecords,
        right: ctx.input.rightRecords
      },
      ...(Object.keys(properties).length > 0 ? { properties } : {})
    });

    let results = result.results ?? [];

    return {
      output: {
        results
      },
      message: `Compared **${ctx.input.leftRecords.length}** record pair${ctx.input.leftRecords.length === 1 ? '' : 's'}.${results.length > 0 ? ` Average score: ${((results.reduce((sum: number, r: { score: number }) => sum + r.score, 0) / results.length) * 100).toFixed(1)}%.` : ''}`
    };
  })
  .build();
