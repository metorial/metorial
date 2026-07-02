import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { spec } from '../spec';

export let exportPackageTool = SlateTool.create(spec, {
  name: 'Export Package',
  key: 'export_package',
  description: `Create an export manifest and export a package of workspace assets from a folder. Useful for CI/CD pipelines and migrating recipes between workspaces. Automatically generates the manifest and initiates the export.`,
  instructions: [
    'The export is asynchronous. After initiating, poll the package status until it completes.',
    'Use the package ID to check status and retrieve the download URL once ready.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the export manifest'),
      folderId: z.number().describe('Folder ID to export assets from')
    })
  )
  .output(
    z.object({
      manifestId: z.number().optional().describe('Export manifest ID'),
      packageId: z.number().optional().describe('Package ID'),
      status: z.string().describe('Export status'),
      downloadUrl: z
        .string()
        .nullable()
        .optional()
        .describe('Download URL when export is complete')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let manifest = await client.createExportManifest({
      name: ctx.input.name,
      folderId: ctx.input.folderId,
      autoGenerateAssets: true,
      autoRun: true
    });

    let manifestResult = manifest.result ?? manifest;
    let manifestId = manifestResult.id;

    let pkg = await client.exportPackage(String(manifestId));

    return {
      output: {
        manifestId,
        packageId: pkg.id,
        status: pkg.status ?? 'in_progress',
        downloadUrl: pkg.download_url ?? null
      },
      message: `Export initiated from folder ${ctx.input.folderId}. Package ID: **${pkg.id}**, status: ${pkg.status ?? 'in_progress'}.`
    };
  });
