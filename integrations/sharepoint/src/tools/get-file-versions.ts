import { SlateTool } from 'slates';
import { z } from 'zod';
import { SharePointClient } from '../lib/client';
import { spec } from '../spec';

let versionSchema = z.object({
  versionId: z.string().describe('Version ID'),
  lastModifiedDateTime: z.string().optional().describe('When this version was created'),
  lastModifiedBy: z.string().optional().describe('User who created this version'),
  size: z.number().optional().describe('Size of this version in bytes')
});

export let getFileVersions = SlateTool.create(spec, {
  name: 'Get File Versions',
  key: 'get_file_versions',
  description: `Retrieve the version history of a file in a SharePoint document library. Returns all versions with their IDs, timestamps, and authors. Useful for auditing changes or rolling back to a previous version.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      driveId: z.string().describe('Drive (document library) ID'),
      itemId: z.string().describe('File item ID')
    })
  )
  .output(
    z.object({
      versions: z.array(versionSchema).describe('File version history'),
      totalCount: z.number().describe('Number of versions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SharePointClient(ctx.auth.token);
    let data = await client.listDriveItemVersions(ctx.input.driveId, ctx.input.itemId);

    let versions = (data.value || []).map((v: any) => ({
      versionId: v.id,
      lastModifiedDateTime: v.lastModifiedDateTime,
      lastModifiedBy: v.lastModifiedBy?.user?.displayName,
      size: v.size
    }));

    return {
      output: {
        versions,
        totalCount: versions.length
      },
      message: `Found **${versions.length}** version(s) for the file.`
    };
  })
  .build();
