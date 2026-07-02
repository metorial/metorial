import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getProjectTool = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve detailed information about a specific Crowdin project, including its configuration, languages, and settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Project ID'),
      name: z.string().describe('Project name'),
      identifier: z.string().describe('Project string identifier'),
      sourceLanguageId: z.string().describe('Source language code'),
      targetLanguageIds: z.array(z.string()).describe('Target language codes'),
      type: z.number().describe('Project type (0=file-based, 1=string-based)'),
      description: z.string().optional().describe('Project description'),
      visibility: z.string().optional().describe('Project visibility'),
      translateDuplicates: z.number().optional(),
      isMtAllowed: z.boolean().optional(),
      autoSubstitution: z.boolean().optional(),
      skipUntranslatedStrings: z.boolean().optional(),
      skipUntranslatedFiles: z.boolean().optional(),
      exportApprovedOnly: z.boolean().optional(),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let project = await client.getProject(ctx.input.projectId);

    return {
      output: {
        projectId: project.id,
        name: project.name,
        identifier: project.identifier,
        sourceLanguageId: project.sourceLanguageId,
        targetLanguageIds: project.targetLanguageIds || [],
        type: project.type,
        description: project.description || undefined,
        visibility: project.visibility || undefined,
        translateDuplicates: project.translateDuplicates,
        isMtAllowed: project.isMtAllowed,
        autoSubstitution: project.autoSubstitution,
        skipUntranslatedStrings: project.skipUntranslatedStrings,
        skipUntranslatedFiles: project.skipUntranslatedFiles,
        exportApprovedOnly: project.exportApprovedOnly,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt || undefined
      },
      message: `Retrieved project **${project.name}** (ID: ${project.id}).`
    };
  })
  .build();
