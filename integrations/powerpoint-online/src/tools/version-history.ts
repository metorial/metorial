import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { spec } from '../spec';

let versionOutputSchema = z.object({
  versionId: z.string().describe('ID of this version'),
  lastModifiedAt: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp when this version was created'),
  size: z.number().optional().describe('File size of this version in bytes'),
  modifiedByName: z
    .string()
    .optional()
    .describe('Display name of the user who created this version'),
  modifiedByEmail: z.string().optional().describe('Email of the user who created this version')
});

export let versionHistory = SlateTool.create(spec, {
  name: 'Version History',
  key: 'version_history',
  description: `List previous versions of a file or restore a specific version. View the complete version history including who made changes and when. Restoring a version creates a new version with the content of the selected version.`
})
  .input(
    z.object({
      operation: z
        .enum(['list', 'restore'])
        .describe(
          'Operation: "list" to view version history, "restore" to restore a previous version.'
        ),
      itemId: z
        .string()
        .optional()
        .describe('ID of the file. Provide either itemId or itemPath.'),
      itemPath: z.string().optional().describe('Path to the file.'),
      driveId: z.string().optional().describe('ID of the drive containing the item.'),
      siteId: z.string().optional().describe('SharePoint site ID.'),
      versionId: z
        .string()
        .optional()
        .describe('ID of the version to restore. Required for "restore" operation.')
    })
  )
  .output(
    z.object({
      versions: z
        .array(versionOutputSchema)
        .optional()
        .describe('Version history (for list operation)'),
      restored: z
        .boolean()
        .optional()
        .describe('Whether the version was restored (for restore operation)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient(ctx.auth.token);

    if (ctx.input.operation === 'restore') {
      if (!ctx.input.versionId) {
        throw new Error('versionId is required for restore operation');
      }

      let itemId = ctx.input.itemId;
      if (!itemId) {
        if (!ctx.input.itemPath) {
          throw new Error('itemId or itemPath is required for restore operation');
        }

        let item = await client.getItem({
          itemPath: ctx.input.itemPath,
          driveId: ctx.input.driveId,
          siteId: ctx.input.siteId
        });
        itemId = item.id;
      }
      if (!itemId) {
        throw new Error('Unable to resolve the file ID for restore operation');
      }

      await client.restoreVersion({
        itemId,
        versionId: ctx.input.versionId,
        driveId: ctx.input.driveId,
        siteId: ctx.input.siteId
      });

      return {
        output: { restored: true },
        message: `Restored version **${ctx.input.versionId}**`
      };
    }

    let versions = await client.listVersions({
      itemId: ctx.input.itemId,
      itemPath: ctx.input.itemPath,
      driveId: ctx.input.driveId,
      siteId: ctx.input.siteId
    });

    let output = versions.map(v => ({
      versionId: v.id,
      lastModifiedAt: v.lastModifiedDateTime,
      size: v.size,
      modifiedByName: v.lastModifiedBy?.user?.displayName,
      modifiedByEmail: v.lastModifiedBy?.user?.email
    }));

    return {
      output: { versions: output },
      message: `Found **${output.length}** version(s)`
    };
  })
  .build();
