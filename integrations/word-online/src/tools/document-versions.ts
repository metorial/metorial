import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let documentVersions = SlateTool.create(spec, {
  name: 'Document Versions',
  key: 'document_versions',
  description: `List or restore previous versions of a Word document in OneDrive or SharePoint.
By default, lists all available versions. Optionally, provide a version ID to restore the document to that specific version.`
})
  .input(
    z.object({
      itemId: z.string().describe('The unique ID of the drive item'),
      restoreVersionId: z
        .string()
        .optional()
        .describe(
          'If provided, restores the document to this version. Otherwise lists all versions.'
        )
    })
  )
  .output(
    z.object({
      versions: z
        .array(
          z.object({
            versionId: z.string().describe('Version identifier'),
            modifiedAt: z.string().optional().describe('ISO 8601 timestamp of this version'),
            modifiedBy: z
              .string()
              .optional()
              .describe('Display name of the user who created this version'),
            size: z.number().optional().describe('Size of this version in bytes')
          })
        )
        .optional()
        .describe('List of versions (returned when listing, not when restoring)'),
      restored: z.boolean().optional().describe('True if a version was restored'),
      restoredVersionId: z.string().optional().describe('The version ID that was restored')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId
    });

    if (ctx.input.restoreVersionId) {
      await client.restoreVersion(ctx.input.itemId, ctx.input.restoreVersionId);
      return {
        output: {
          restored: true,
          restoredVersionId: ctx.input.restoreVersionId
        },
        message: `Restored item \`${ctx.input.itemId}\` to version **${ctx.input.restoreVersionId}**`
      };
    }

    let versions = await client.listVersions(ctx.input.itemId);

    return {
      output: {
        versions: versions.map(v => ({
          versionId: v.versionId,
          modifiedAt: v.modifiedAt,
          modifiedBy: v.modifiedBy,
          size: v.size
        }))
      },
      message: `Found **${versions.length}** versions for item \`${ctx.input.itemId}\``
    };
  })
  .build();
