import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
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
      projectId: z.string().describe('Project URL slug (e.g., "my-project-abc12")')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Unique project identifier'),
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
    let versions = (project.versions || []).map((v: any) => ({
      versionId: v.id || String(v.name),
      versionNumber: typeof v.name === 'number' ? v.name : Number.parseInt(v.name, 10) || 0,
      imageCount: v.images,
      preprocessing: v.preprocessing,
      augmentation: v.augmentation,
      hasModel: !!v.model,
      createdAt: v.created
    }));

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
