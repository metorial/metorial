import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let driveSchema = z.object({
  driveId: z.string().describe('Unique ID of the drive'),
  name: z.string().describe('Display name of the drive'),
  driveType: z.string().describe('Type of drive (personal, business, documentLibrary)'),
  webUrl: z.string().describe('URL to view the drive in a browser'),
  ownerName: z.string().optional().describe('Display name of the drive owner'),
  quotaTotal: z.number().optional().describe('Total storage quota in bytes'),
  quotaUsed: z.number().optional().describe('Storage used in bytes'),
  quotaRemaining: z.number().optional().describe('Storage remaining in bytes'),
  quotaState: z
    .string()
    .optional()
    .describe('Quota state (normal, nearing, critical, exceeded)')
});

export let listDrivesTool = SlateTool.create(spec, {
  name: 'List Drives',
  key: 'list_drives',
  description: `Retrieves all available drives for the authenticated user, including their personal OneDrive and any shared drives or SharePoint document libraries they have access to. Returns drive metadata including storage quota information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      driveId: z
        .string()
        .optional()
        .describe(
          'If provided, retrieves details for a specific drive by ID instead of listing all drives'
        )
    })
  )
  .output(
    z.object({
      drives: z.array(driveSchema).describe('List of available drives')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.driveId) {
      let drive = await client.getDrive(ctx.input.driveId);
      let mapped = {
        driveId: drive.id,
        name: drive.name,
        driveType: drive.driveType,
        webUrl: drive.webUrl,
        ownerName: drive.owner?.user?.displayName || drive.owner?.group?.displayName,
        quotaTotal: drive.quota?.total,
        quotaUsed: drive.quota?.used,
        quotaRemaining: drive.quota?.remaining,
        quotaState: drive.quota?.state
      };
      return {
        output: { drives: [mapped] },
        message: `Retrieved drive **${drive.name}** (${drive.driveType}).`
      };
    }

    let [myDrive, otherDrives] = await Promise.all([client.getDrive(), client.listDrives()]);

    let allDrives = [myDrive, ...otherDrives.filter(d => d.id !== myDrive.id)];
    let drives = allDrives.map(drive => ({
      driveId: drive.id,
      name: drive.name,
      driveType: drive.driveType,
      webUrl: drive.webUrl,
      ownerName: drive.owner?.user?.displayName || drive.owner?.group?.displayName,
      quotaTotal: drive.quota?.total,
      quotaUsed: drive.quota?.used,
      quotaRemaining: drive.quota?.remaining,
      quotaState: drive.quota?.state
    }));

    return {
      output: { drives },
      message: `Found **${drives.length}** drive(s).`
    };
  })
  .build();
