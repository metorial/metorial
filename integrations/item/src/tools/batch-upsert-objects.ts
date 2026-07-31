import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validateBatchObjects } from '../lib/validation';
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
        .trim()
        .min(1)
        .describe('Object type slug such as "contacts", "companies", or a custom object slug'),
      objects: z
        .array(
          z.object({
            name: z.string().trim().min(1).describe('Non-empty display name for the record'),
            matchBy: z
              .enum(['id', 'email', 'name'])
              .optional()
              .describe(
                'How to match an existing record. Provide together with matchValue; email is supported only for contacts.'
              ),
            matchValue: z
              .union([z.string(), z.number()])
              .optional()
              .describe(
                'Value paired with matchBy: a positive integer for id, valid contact email for email, or non-empty string for name'
              ),
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
            .int()
            .positive()
            .nullable()
            .describe('Created or updated record ID, or null when that row failed'),
          status: z.enum(['created', 'updated', 'failed']).describe('Per-record result'),
          error: z.string().optional().describe('Failure reason when status is failed')
        })
      ),
      summary: z.object({
        total: z.number().int().min(0).describe('Total records submitted'),
        created: z.number().int().min(0).describe('Number of created records'),
        updated: z.number().int().min(0).describe('Number of updated records'),
        failed: z.number().int().min(0).describe('Number of failed records')
      })
    })
  )
  .handleInvocation(async ctx => {
    validateBatchObjects(ctx.input.objectType, ctx.input.objects);
    let client = new Client({ token: ctx.auth.token });
    let result = await client.batchUpsertObjects(ctx.input.objectType, ctx.input.objects);

    return {
      output: {
        results: result.results.map(entry => ({
          objectId: entry.id,
          status: entry.status,
          error: entry.error
        })),
        summary: result.summary
      },
      message:
        result.summary.failed > 0
          ? `Processed **${result.summary.total}** record(s) for **${ctx.input.objectType}**: **${result.summary.created}** created, **${result.summary.updated}** updated, and **${result.summary.failed}** failed. Review the failed rows and retry them after correcting the reported errors.`
          : `Processed **${result.summary.total}** record(s) for **${ctx.input.objectType}**: **${result.summary.created}** created and **${result.summary.updated}** updated.`
    };
  })
  .build();
