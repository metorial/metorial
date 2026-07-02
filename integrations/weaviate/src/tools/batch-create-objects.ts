import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let batchCreateObjects = SlateTool.create(spec, {
  name: 'Batch Create Objects',
  key: 'batch_create_objects',
  description: `Import multiple objects into one or more collections in a single batch request. Optionally include pre-computed vectors for each object. Supports multi-tenant collections.`,
  constraints: [
    'Maximum recommended batch size is 100 objects per request for optimal performance.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      objects: z
        .array(
          z.object({
            collectionName: z.string().describe('Collection to add the object to'),
            properties: z.record(z.string(), z.any()).describe('Object property values'),
            objectId: z.string().optional().describe('Optional UUID'),
            vector: z.array(z.number()).optional().describe('Optional pre-computed vector'),
            tenant: z.string().optional().describe('Tenant name for multi-tenant collections')
          })
        )
        .describe('Array of objects to create')
    })
  )
  .output(
    z.object({
      totalCreated: z.number().describe('Number of objects created'),
      totalErrors: z.number().describe('Number of failed objects'),
      results: z
        .array(
          z.object({
            objectId: z.string().optional().describe('Object UUID'),
            status: z.string().describe('Creation status'),
            errors: z.array(z.string()).optional().describe('Error messages if any')
          })
        )
        .describe('Per-object results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let batchObjects = ctx.input.objects.map(obj => ({
      class: obj.collectionName,
      properties: obj.properties,
      id: obj.objectId,
      vector: obj.vector,
      tenant: obj.tenant
    }));

    let results = await client.batchCreateObjects(batchObjects);

    let totalErrors = 0;
    let totalCreated = 0;
    let resultSummary = (results || []).map((r: any) => {
      let hasErrors = r.result?.errors?.error && r.result.errors.error.length > 0;
      if (hasErrors) {
        totalErrors++;
      } else {
        totalCreated++;
      }
      return {
        objectId: r.id,
        status: hasErrors ? 'failed' : 'success',
        errors: hasErrors ? r.result.errors.error.map((e: any) => e.message) : undefined
      };
    });

    return {
      output: {
        totalCreated,
        totalErrors,
        results: resultSummary
      },
      message: `Batch import: **${totalCreated}** created, **${totalErrors}** failed out of ${ctx.input.objects.length} objects.`
    };
  })
  .build();
