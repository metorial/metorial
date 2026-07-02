import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listProjectsTool = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all Crowdin projects accessible to the authenticated user. Returns project details including name, source/target languages, type, and progress information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of projects to return (max 500, default 25)'),
      offset: z.number().optional().describe('Number of projects to skip'),
      hasManagerAccess: z
        .boolean()
        .optional()
        .describe('Filter to only projects where the user has manager access')
    })
  )
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectId: z.number().describe('Project ID'),
          name: z.string().describe('Project name'),
          identifier: z.string().describe('Project string identifier'),
          sourceLanguageId: z.string().describe('Source language code'),
          targetLanguageIds: z.array(z.string()).describe('Target language codes'),
          type: z.number().describe('Project type (0=file-based, 1=string-based)'),
          description: z.string().optional().describe('Project description'),
          visibility: z.string().optional().describe('Project visibility'),
          createdAt: z.string().describe('Creation timestamp')
        })
      ),
      pagination: z.object({
        offset: z.number(),
        limit: z.number()
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listProjects({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      hasManagerAccess: ctx.input.hasManagerAccess ? 1 : undefined
    });

    let projects = result.data.map((item: any) => ({
      projectId: item.data.id,
      name: item.data.name,
      identifier: item.data.identifier,
      sourceLanguageId: item.data.sourceLanguageId,
      targetLanguageIds: item.data.targetLanguageIds || [],
      type: item.data.type,
      description: item.data.description || undefined,
      visibility: item.data.visibility || undefined,
      createdAt: item.data.createdAt
    }));

    return {
      output: {
        projects,
        pagination: result.pagination
      },
      message: `Found **${projects.length}** projects.`
    };
  })
  .build();
