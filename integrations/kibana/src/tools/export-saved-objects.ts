import { createTextAttachment, SlateTool } from 'slates';
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
      contentType: z.string().describe('MIME type of the exported attachment'),
      contentLength: z.number().describe('Size of the exported NDJSON in bytes'),
      lineCount: z.number().describe('Number of NDJSON lines returned by Kibana'),
      attachmentCount: z.number().describe('Number of attachments returned')
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

    let lineCount = ndjson.trim() ? ndjson.trim().split('\n').length : 0;
    let contentType = 'application/x-ndjson';

    return {
      output: {
        contentType,
        contentLength: Buffer.byteLength(ndjson, 'utf8'),
        lineCount,
        attachmentCount: 1
      },
      attachments: [createTextAttachment(ndjson, contentType)],
      message: `Exported **${lineCount}** saved objects in NDJSON format.`
    };
  })
  .build();
