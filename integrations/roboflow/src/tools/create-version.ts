import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createVersionTool = SlateTool.create(spec, {
  name: 'Create Version',
  key: 'create_version',
  description: `Generate a new versioned snapshot of a project's dataset with optional preprocessing and augmentation settings. The version is generated asynchronously. Use **Get Version** to check generation progress.

Preprocessing options include auto-orient, resize, grayscale, static crop, and tile. Augmentation options include flip, rotate, crop, brightness, blur, noise, cutout, mosaic, and more.`,
  instructions: [
    'Preprocessing and augmentation are both optional. If omitted, defaults will be used.',
    'Version generation happens asynchronously. Poll the version to check progress.'
  ]
})
  .input(
    z.object({
      projectId: z.string().describe('Project URL slug'),
      preprocessing: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Preprocessing settings (e.g., {"auto-orient": true, "resize": {"width": 640, "height": 640}})'
        ),
      augmentation: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Augmentation settings (e.g., {"flip": {"horizontal": true}, "rotate": {"degrees": 15}})'
        )
    })
  )
  .output(
    z.object({
      versionNumber: z.number().optional().describe('Number of the generated version'),
      status: z.string().describe('Generation status')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let workspaceId = await client.getWorkspaceId();

    let result = await client.createVersion(workspaceId, ctx.input.projectId, {
      preprocessing: ctx.input.preprocessing,
      augmentation: ctx.input.augmentation
    });

    let versionNumber = result.version || result.name;

    return {
      output: {
        versionNumber:
          typeof versionNumber === 'number'
            ? versionNumber
            : Number.parseInt(versionNumber, 10) || undefined,
        status: result.status || 'generating'
      },
      message: versionNumber
        ? `Started generating version **${versionNumber}** for project **${ctx.input.projectId}**. Use Get Version to check progress.`
        : `Started generating a new version for project **${ctx.input.projectId}**.`
    };
  })
  .build();
