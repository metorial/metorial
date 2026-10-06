import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { field, idNumber, invalid, malformed, numericId, required } from '../lib/validation';
import { spec } from '../spec';

export let exportPackageTool = SlateTool.create(spec, {
  name: 'Export Package',
  key: 'export_package',
  description: `Create an export manifest and export a package of workspace assets from a folder. Useful for CI/CD pipelines and migrating recipes between workspaces. Automatically generates the manifest and initiates the export.`,
  instructions: [
    'The export is asynchronous. After initiating, poll the package status until it completes.',
    'Use action=status or download with packageId after creation; these actions do not create another export.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'status', 'download'])
        .optional()
        .describe(
          'Create one export, read exact status, or download a completed export. Defaults to create.'
        ),
      packageId: z
        .string()
        .optional()
        .describe('Exact package ID for status/download; no new export is created.'),
      name: z.string().optional().describe('Name for the export manifest'),
      folderId: z.number().optional().describe('Folder ID to export assets from')
    })
  )
  .output(
    z.object({
      manifestId: z.number().optional().describe('Export manifest ID'),
      packageId: z.number().optional().describe('Package ID'),
      status: z.string().optional().describe('Export status'),
      downloadUrl: z
        .string()
        .nullable()
        .optional()
        .describe('Download URL when export is complete')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const action = ctx.input.action ?? 'create';
    let manifestId: number | undefined;
    let pkg: Record<string, unknown>;
    if (action === 'create') {
      const manifest = await client.createExportManifest({
        name: required(ctx.input.name, 'Manifest name'),
        folderId: idNumber(numericId(ctx.input.folderId, 'folderId')),
        autoGenerateAssets: true,
        autoRun: false
      });
      manifestId = idNumber(manifest.id);
      pkg = await client.exportPackage(String(manifestId));
      if (idNumber(pkg.export_manifest_id) !== manifestId) malformed();
    } else {
      pkg = await client.getPackage(numericId(ctx.input.packageId, 'packageId'));
      if (String(idNumber(pkg.id)) !== numericId(ctx.input.packageId, 'packageId'))
        malformed();
      manifestId =
        pkg.export_manifest_id === undefined ? undefined : idNumber(pkg.export_manifest_id);
    }
    if (pkg.operation_type !== 'export') malformed();
    const packageId = idNumber(pkg.id);
    const status = field(pkg, 'status', z.string().min(1));
    const downloadUrl = field(pkg, 'download_url', z.string().nullable().optional());
    if (downloadUrl !== undefined && downloadUrl !== null) {
      let url: URL;
      try {
        url = new URL(downloadUrl);
      } catch {
        return malformed();
      }
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        url.port ||
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      )
        malformed();
    }
    if (action === 'download') {
      if (status !== 'completed')
        invalid(
          'The export must be completed before downloading. Read status with the same packageId; do not create another export.'
        );
      await ctx.addAttachment({
        type: 'url',
        url: client.getPackageDownloadUrl(String(packageId)),
        headers: { Authorization: `Bearer ${ctx.auth.token}` },
        mimeType: 'application/zip'
      });
    }
    return {
      output: { manifestId, packageId, status, downloadUrl },
      message: `Export package ${packageId}: ${status}. Export manifests and package archives are retained; submission does not prove completion.`
    };
  });
