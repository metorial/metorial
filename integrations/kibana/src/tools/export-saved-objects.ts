import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let exportSavedObjects = SlateTool.create(spec, {
  name: 'Export Saved Objects',
  key: 'export_saved_objects',
  description: `Export Kibana saved objects in NDJSON format for backup or migration between environments.
Specify either object types to export all objects of those types, or provide specific object IDs to export selectively.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      types: z
        .array(z.string())
        .optional()
        .describe('Types of saved objects to export (e.g., ["dashboard", "visualization"])'),
      objects: z
        .array(
          z.object({
            type: z.string().describe('Type of the saved object'),
            objectId: z.string().describe('ID of the saved object')
          })
        )
        .optional()
        .describe('Specific saved objects to export'),
      includeReferencesDeep: z
        .boolean()
        .optional()
        .describe('Include all referenced objects recursively (default false)'),
      excludeExportDetails: z
        .boolean()
        .optional()
        .describe('Exclude the export summary object from the output')
    })
  )
  .output(
    z.object({
      ndjson: z.string().describe('Exported saved objects in NDJSON format')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let mappedObjects = ctx.input.objects?.map(o => ({ type: o.type, id: o.objectId }));

    let ndjson = await client.exportSavedObjects({
      types: ctx.input.types,
      objects: mappedObjects,
      includeReferencesDeep: ctx.input.includeReferencesDeep,
      excludeExportDetails: ctx.input.excludeExportDetails
    });

    let lineCount = ndjson.trim().split('\n').length;

    return {
      output: { ndjson },
      message: `Exported **${lineCount}** saved objects in NDJSON format.`
    };
  })
  .build();
