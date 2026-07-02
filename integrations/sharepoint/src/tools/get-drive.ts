import { SlateTool } from 'slates';
import { z } from 'zod';
import { SharePointClient } from '../lib/client';
import { spec } from '../spec';
import { oneOfRequiredError } from './errors';

let driveOutputSchema = z.object({
  driveId: z.string().describe('Unique drive ID'),
  driveName: z.string().describe('Display name of the drive'),
  driveType: z.string().optional().describe('Type of drive (e.g. "documentLibrary")'),
  webUrl: z.string().optional().describe('URL of the drive'),
  createdDateTime: z.string().optional().describe('When the drive was created'),
  lastModifiedDateTime: z.string().optional().describe('When the drive was last modified'),
  totalSize: z.number().optional().describe('Total storage quota in bytes'),
  usedSize: z.number().optional().describe('Used storage in bytes'),
  remainingSize: z.number().optional().describe('Remaining storage in bytes'),
  ownerName: z.string().optional().describe('Display name of the drive owner')
});

export let getDrive = SlateTool.create(spec, {
  name: 'Get Drives',
  key: 'get_drive',
  description: `Retrieve document libraries (drives) for a SharePoint site. Can get the default drive, a specific drive by ID, or list all drives on a site. Drives are the containers for files in SharePoint.`,
  instructions: [
    'Provide **siteId** with **listAll** set to true to list all drives on a site.',
    'Provide **driveId** to retrieve a specific drive by ID.',
    'Provide **siteId** without **listAll** to get the default document library.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      siteId: z.string().optional().describe('SharePoint site ID'),
      driveId: z.string().optional().describe('Specific drive ID to retrieve'),
      listAll: z.boolean().optional().describe('If true, list all drives on the site')
    })
  )
  .output(
    z.object({
      drive: driveOutputSchema.optional().describe('Single drive details'),
      drives: z
        .array(driveOutputSchema)
        .optional()
        .describe('All drives (when listAll is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SharePointClient(ctx.auth.token);

    let mapDrive = (d: any) => ({
      driveId: d.id,
      driveName: d.name,
      driveType: d.driveType,
      webUrl: d.webUrl,
      createdDateTime: d.createdDateTime,
      lastModifiedDateTime: d.lastModifiedDateTime,
      totalSize: d.quota?.total,
      usedSize: d.quota?.used,
      remainingSize: d.quota?.remaining,
      ownerName: d.owner?.user?.displayName
    });

    if (ctx.input.driveId) {
      let drive = await client.getDrive(ctx.input.driveId);
      return {
        output: { drive: mapDrive(drive) },
        message: `Retrieved drive **${drive.name}** (\`${drive.id}\`).`
      };
    }

    if (!ctx.input.siteId) {
      throw oneOfRequiredError('One of siteId or driveId must be provided.', [
        'siteId',
        'driveId'
      ]);
    }

    if (ctx.input.listAll) {
      let data = await client.listDrives(ctx.input.siteId);
      let drives = (data.value || []).map(mapDrive);
      return {
        output: { drives },
        message: `Found **${drives.length}** drive(s) on the site.`
      };
    }

    let drive = await client.getDefaultDrive(ctx.input.siteId);
    return {
      output: { drive: mapDrive(drive) },
      message: `Retrieved default drive **${drive.name}** (\`${drive.id}\`).`
    };
  })
  .build();
