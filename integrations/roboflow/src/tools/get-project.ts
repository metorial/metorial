import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getProjectTool = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Get detailed information about a specific Roboflow project, including its dataset versions, annotation classes, image splits, and training status. Use the project URL slug as the projectId.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: projectIdSchema
    })
  )
  .output(
    z.object({
      projectId: projectIdSchema,
      name: z.string().describe('Display name of the project'),
      type: z.string().describe('Project type (e.g., object-detection, classification)'),
      imageCount: z.number().describe('Total number of images'),
      unannotatedCount: z.number().describe('Number of unannotated images'),
      isPublic: z.boolean().describe('Whether the project is publicly accessible'),
      classes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Map of class names to their metadata'),
      splits: z
        .record(z.string(), z.number())
        .optional()
        .describe('Image count per split (train/valid/test)'),
      annotation: z.string().optional().describe('Annotation group name'),
      versions: z
        .array(
          z.object({
            versionId: z.string().describe('Version identifier'),
            versionNumber: z.number().describe('Version number'),
            imageCount: z.number().optional().describe('Number of images in the version'),
            preprocessing: z.any().optional().describe('Preprocessing configuration'),
            augmentation: z.any().optional().describe('Augmentation configuration'),
            hasModel: z.boolean().describe('Whether this version has a trained model'),
            createdAt: z
              .number()
              .optional()
              .describe('Unix timestamp when version was created')
          })
        )
        .describe('List of dataset versions')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let workspaceId = await client.getWorkspaceId();
    let data = await client.getProject(workspaceId, ctx.input.projectId);

    let project = data.project || data;
    const rawVersions = Array.isArray(data.versions)
      ? data.versions
      : Array.isArray(project.versions)
        ? project.versions
        : [];
    let versions = rawVersions.map((v: any) => {
      const versionNumber = Number.parseInt(
        typeof v.id === 'string' ? v.id.split('/').at(-1)! : String(v.version ?? v.name),
        10
      );
      if (!Number.isInteger(versionNumber) || versionNumber < 1) {
        throw createApiServiceError(
          'Roboflow returned a dataset version without a usable version number.'
        );
      }
      return {
        versionId: v.id || `${project.id || ctx.input.projectId}/${versionNumber}`,
        versionNumber,
        imageCount: v.images,
        preprocessing: v.preprocessing,
        augmentation: v.augmentation,
        hasModel: !!v.model,
        createdAt: v.created
      };
    });

    return {
      output: {
        projectId: project.id || ctx.input.projectId,
        name: project.name,
        type: project.type,
        imageCount: project.images || 0,
        unannotatedCount: project.unannotated || 0,
        isPublic: project.public || false,
        classes: project.classes,
        splits: project.splits,
        annotation: project.annotation,
        versions
      },
      message: `Project **${project.name}** has **${project.images || 0}** images and **${versions.length}** version(s).`
    };
  })
  .build();
