import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaggleClient } from '../lib/client';
import { spec } from '../spec';

export let createDataset = SlateTool.create(spec, {
  name: 'Create Dataset',
  key: 'create_dataset',
  description: `Create a new Kaggle dataset or publish a new version of an existing dataset. For new datasets, provide a title and file tokens obtained from file uploads. For new versions, specify the existing dataset reference and version notes.`,
  instructions: [
    'File tokens must be obtained by uploading files to Kaggle first.',
    'When creating a new version, provide both the ownerSlug/datasetSlug of the existing dataset and versionNotes describing the changes.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z
        .string()
        .optional()
        .describe('Title for a new dataset (required when creating a new dataset)'),
      ownerSlug: z
        .string()
        .optional()
        .describe('Owner slug for creating a new version of an existing dataset'),
      datasetSlug: z
        .string()
        .optional()
        .describe('Dataset slug for creating a new version of an existing dataset'),
      licenseName: z
        .string()
        .optional()
        .describe('License name (e.g., "CC0-1.0", "CC-BY-SA-4.0")'),
      subtitle: z.string().optional().describe('Short subtitle for the dataset'),
      description: z.string().optional().describe('Full description of the dataset'),
      files: z
        .array(
          z.object({
            fileToken: z.string().describe('Upload token for the file'),
            fileDescription: z.string().optional().describe('Description of the file')
          })
        )
        .describe('Files to include in the dataset'),
      isPrivate: z.boolean().optional().describe('Whether the dataset should be private'),
      versionNotes: z
        .string()
        .optional()
        .describe('Version notes (required when creating a new version)'),
      deleteOldVersions: z
        .boolean()
        .optional()
        .describe('Whether to delete old versions when creating a new version')
    })
  )
  .output(
    z
      .object({
        ref: z.string().optional().describe('Reference to the created/updated dataset'),
        url: z.string().optional().describe('URL of the created/updated dataset'),
        status: z.string().optional().describe('Creation status'),
        error: z.string().optional().describe('Error message if creation failed')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new KaggleClient(ctx.auth);
    let mappedFiles = ctx.input.files.map(f => ({
      token: f.fileToken,
      description: f.fileDescription
    }));

    let isNewVersion = ctx.input.ownerSlug && ctx.input.datasetSlug && ctx.input.versionNotes;

    let result: any;
    if (isNewVersion) {
      result = await client.createDatasetVersion(
        ctx.input.ownerSlug!,
        ctx.input.datasetSlug!,
        {
          versionNotes: ctx.input.versionNotes!,
          subtitle: ctx.input.subtitle,
          description: ctx.input.description,
          files: mappedFiles,
          deleteOldVersions: ctx.input.deleteOldVersions
        }
      );
    } else {
      result = await client.createDataset({
        title: ctx.input.title!,
        licenseName: ctx.input.licenseName,
        subtitle: ctx.input.subtitle,
        description: ctx.input.description,
        files: mappedFiles,
        isPrivate: ctx.input.isPrivate
      });
    }

    return {
      output: result ?? {},
      message: isNewVersion
        ? `Created new version of dataset **${ctx.input.ownerSlug}/${ctx.input.datasetSlug}**.`
        : `Created new dataset **${ctx.input.title}**.`
    };
  })
  .build();
