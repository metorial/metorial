import { SlateTool } from 'slates';
import { z } from 'zod';
import { lambdaServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageLayer = SlateTool.create(spec, {
  name: 'Manage Layer',
  key: 'manage_layer',
  description: `Publish, get, delete, or list Lambda layers and their versions. Layers are reusable packages of libraries, dependencies, or custom runtimes that can be attached to functions.`,
  instructions: [
    'Use **action** to specify the operation: "publish", "get", "delete", "list_layers", or "list_versions".',
    'When publishing, provide the layer content via an S3 location or base64-encoded ZIP.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['publish', 'get', 'delete', 'list_layers', 'list_versions'])
        .describe('Operation to perform'),
      layerName: z
        .string()
        .optional()
        .describe('Layer name (required for publish/get/delete/list_versions)'),
      versionNumber: z
        .number()
        .optional()
        .describe('Layer version number (required for get/delete)'),
      content: z
        .object({
          s3Bucket: z.string().optional().describe('S3 bucket with the layer archive'),
          s3Key: z.string().optional().describe('S3 object key'),
          s3ObjectVersion: z.string().optional().describe('S3 object version'),
          zipFile: z.string().optional().describe('Base64-encoded ZIP file')
        })
        .optional()
        .describe('Layer content (required for publish)'),
      compatibleRuntimes: z
        .array(z.string())
        .optional()
        .describe('Compatible runtimes (e.g., ["nodejs22.x", "python3.13"])'),
      compatibleArchitectures: z
        .array(z.enum(['x86_64', 'arm64']))
        .optional()
        .describe('Compatible architectures'),
      description: z.string().optional().describe('Layer version description'),
      licenseInfo: z.string().optional().describe('Layer license information'),
      compatibleRuntimeFilter: z
        .string()
        .optional()
        .describe('Filter layers by compatible runtime (for list_layers)')
    })
  )
  .output(
    z.object({
      layerArn: z.string().optional().describe('Layer ARN'),
      layerVersionArn: z.string().optional().describe('Layer version ARN'),
      versionNumber: z.number().optional().describe('Layer version number'),
      description: z.string().optional().describe('Layer description'),
      codeSize: z.number().optional().describe('Layer code size in bytes'),
      codeSha256: z.string().optional().describe('SHA256 of the layer code'),
      compatibleRuntimes: z.array(z.string()).optional().describe('Compatible runtimes'),
      layers: z
        .array(
          z.object({
            layerName: z.string().optional(),
            layerArn: z.string().optional(),
            latestVersion: z.number().optional(),
            latestDescription: z.string().optional()
          })
        )
        .optional()
        .describe('List of layers (for list_layers)'),
      versions: z
        .array(
          z.object({
            layerVersionArn: z.string().optional(),
            versionNumber: z.number().optional(),
            description: z.string().optional(),
            compatibleRuntimes: z.array(z.string()).optional()
          })
        )
        .optional()
        .describe('List of layer versions (for list_versions)'),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action, layerName } = ctx.input;

    if (action === 'list_layers') {
      let result = await client.listLayers(
        undefined,
        undefined,
        ctx.input.compatibleRuntimeFilter
      );
      let layers = (result.Layers || []).map((l: any) => ({
        layerName: l.LayerName,
        layerArn: l.LayerArn,
        latestVersion: l.LatestMatchingVersion?.Version,
        latestDescription: l.LatestMatchingVersion?.Description
      }));
      return {
        output: { layers },
        message: `Found **${layers.length}** layer(s).`
      };
    }

    if (!layerName) throw lambdaServiceError('layerName is required for this action');

    if (action === 'list_versions') {
      let result = await client.listLayerVersions(layerName);
      let versions = (result.LayerVersions || []).map((v: any) => ({
        layerVersionArn: v.LayerVersionArn,
        versionNumber: v.Version,
        description: v.Description,
        compatibleRuntimes: v.CompatibleRuntimes
      }));
      return {
        output: { versions },
        message: `Found **${versions.length}** version(s) of layer **${layerName}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.versionNumber)
        throw lambdaServiceError('versionNumber is required for delete');
      await client.deleteLayerVersion(layerName, ctx.input.versionNumber);
      return {
        output: { deleted: true },
        message: `Deleted version **${ctx.input.versionNumber}** of layer **${layerName}**.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.versionNumber)
        throw lambdaServiceError('versionNumber is required for get');
      let result = await client.getLayerVersion(layerName, ctx.input.versionNumber);
      return {
        output: {
          layerArn: result.LayerArn,
          layerVersionArn: result.LayerVersionArn,
          versionNumber: result.Version,
          description: result.Description,
          codeSize: result.Content?.CodeSize,
          codeSha256: result.Content?.CodeSha256,
          compatibleRuntimes: result.CompatibleRuntimes
        },
        message: `Layer **${layerName}** version **${result.Version}** (${result.Content?.CodeSize || 0} bytes).`
      };
    }

    // publish
    if (!ctx.input.content)
      throw lambdaServiceError('content is required for publishing a layer');
    let contentObj: Record<string, any> = {};
    if (ctx.input.content.s3Bucket) contentObj.S3Bucket = ctx.input.content.s3Bucket;
    if (ctx.input.content.s3Key) contentObj.S3Key = ctx.input.content.s3Key;
    if (ctx.input.content.s3ObjectVersion)
      contentObj.S3ObjectVersion = ctx.input.content.s3ObjectVersion;
    if (ctx.input.content.zipFile) contentObj.ZipFile = ctx.input.content.zipFile;

    let params: Record<string, any> = { Content: contentObj };
    if (ctx.input.compatibleRuntimes) params.CompatibleRuntimes = ctx.input.compatibleRuntimes;
    if (ctx.input.compatibleArchitectures)
      params.CompatibleArchitectures = ctx.input.compatibleArchitectures;
    if (ctx.input.description) params.Description = ctx.input.description;
    if (ctx.input.licenseInfo) params.LicenseInfo = ctx.input.licenseInfo;

    let result = await client.publishLayerVersion(layerName, params);
    return {
      output: {
        layerArn: result.LayerArn,
        layerVersionArn: result.LayerVersionArn,
        versionNumber: result.Version,
        description: result.Description,
        codeSize: result.Content?.CodeSize,
        codeSha256: result.Content?.CodeSha256,
        compatibleRuntimes: result.CompatibleRuntimes
      },
      message: `Published layer **${layerName}** version **${result.Version}**.`
    };
  })
  .build();
