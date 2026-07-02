import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let batchUpsertObjects = SlateTool.create(spec, {
  name: 'Batch Upsert Objects',
  key: 'batch_upsert_objects',
  description:
    'Create or update up to 100 item records in one request. Each record is processed independently, so partial success is possible.'
})
  .input(
    z.object({
      objectType: z
        .string()
        .describe('Object type slug such as "contacts", "companies", or a custom object slug'),
      objects: z
        .array(
          z.object({
            name: z.string().describe('Display name for the record'),
            matchBy: z
              .enum(['id', 'email', 'name'])
              .optional()
              .describe('How to match an existing record before updating'),
            matchValue: z
              .union([z.string(), z.number()])
              .optional()
              .describe('Value to match against when matchBy is provided'),
            fields: z
              .record(z.string(), z.any())
              .optional()
              .describe('System and custom fields to set'),
            profileImageUrl: z
              .string()
              .url()
              .optional()
              .describe('Avatar URL for contacts or logo URL for companies')
          })
        )
        .min(1)
        .max(100)
        .describe('Records to create or update')
    })
  )
  .output(
    z.object({
      results: z.array(
        z.object({
          objectId: z
            .number()
            .nullable()
            .describe('Created or updated record ID, or null when that row failed'),
          status: z.enum(['created', 'updated', 'failed']).describe('Per-record result'),
          error: z.string().optional().describe('Failure reason when status is failed')
        })
      ),
      summary: z.object({
        total: z.number().describe('Total records submitted'),
        created: z.number().describe('Number of created records'),
        updated: z.number().describe('Number of updated records'),
        failed: z.number().describe('Number of failed records')
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.batchUpsertObjects(ctx.input.objectType, ctx.input.objects);

    return {
      output: {
        results: (result.results ?? []).map((entry: any) => ({
          objectId: entry.id ?? null,
          status: entry.status,
          error: entry.error
        })),
        summary: {
          total: result.summary?.total ?? ctx.input.objects.length,
          created: result.summary?.created ?? 0,
          updated: result.summary?.updated ?? 0,
          failed: result.summary?.failed ?? 0
        }
      },
      message: `Processed **${ctx.input.objects.length}** record(s) for **${ctx.input.objectType}**.`
    };
  })
  .build();
