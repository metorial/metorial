import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getVersionTool = SlateTool.create(spec, {
  name: 'Get Version',
  key: 'get_version',
  description: `Get detailed information about a specific dataset version, including preprocessing and augmentation settings, training results (mAP, precision, recall), and model endpoint details. Use this to check training progress or model performance.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project URL slug'),
      versionNumber: z.number().describe('Version number to retrieve')
    })
  )
  .output(
    z.object({
      versionId: z.string().describe('Version identifier'),
      versionNumber: z.number().describe('Version number'),
      projectName: z.string().optional().describe('Name of the parent project'),
      projectType: z.string().optional().describe('Type of the parent project'),
      imageCount: z.number().optional().describe('Number of images in this version'),
      splits: z.record(z.string(), z.number()).optional().describe('Image counts per split'),
      preprocessing: z
        .any()
        .optional()
        .describe('Preprocessing settings applied to this version'),
      augmentation: z
        .any()
        .optional()
        .describe('Augmentation settings applied to this version'),
      isGenerating: z
        .boolean()
        .optional()
        .describe('Whether the version is currently being generated'),
      progress: z.number().optional().describe('Generation progress (0-1)'),
      model: z
        .object({
          modelId: z.string().optional().describe('Model identifier'),
          endpoint: z.string().optional().describe('Inference API endpoint URL'),
          map: z.number().optional().describe('Mean Average Precision'),
          precision: z.number().optional().describe('Precision metric'),
          recall: z.number().optional().describe('Recall metric'),
          trainingStartedAt: z.string().optional().describe('Training start time'),
          trainingCompletedAt: z.string().optional().describe('Training completion time')
        })
        .optional()
        .describe('Trained model details and performance metrics'),
      exportFormats: z.array(z.string()).optional().describe('Available export formats'),
      createdAt: z.number().optional().describe('Unix timestamp when version was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let workspaceId = await client.getWorkspaceId();
    let data = await client.getVersion(
      workspaceId,
      ctx.input.projectId,
      ctx.input.versionNumber
    );

    let version = data.version || data;
    let project = data.project || {};
    let model = version.model;

    let modelOutput = model
      ? {
          modelId: model.id,
          endpoint: model.endpoint,
          map: model.map,
          precision: model.precision,
          recall: model.recall,
          trainingStartedAt: model.fromAgent || model.startedAt,
          trainingCompletedAt: model.toAgent || model.completedAt
        }
      : undefined;

    return {
      output: {
        versionId: version.id || `${ctx.input.projectId}/${ctx.input.versionNumber}`,
        versionNumber: ctx.input.versionNumber,
        projectName: project.name,
        projectType: project.type,
        imageCount: version.images,
        splits: version.splits,
        preprocessing: version.preprocessing,
        augmentation: version.augmentation,
        isGenerating: version.generating || false,
        progress: version.progress,
        model: modelOutput,
        exportFormats: version.exports ? Object.keys(version.exports) : undefined,
        createdAt: version.created
      },
      message: model
        ? `Version **${ctx.input.versionNumber}** has a trained model with mAP: **${model.map || 'N/A'}**, precision: **${model.precision || 'N/A'}**, recall: **${model.recall || 'N/A'}**.`
        : `Version **${ctx.input.versionNumber}** has **${version.images || 0}** images. ${version.generating ? 'Currently generating...' : 'No model trained yet.'}`
    };
  })
  .build();
