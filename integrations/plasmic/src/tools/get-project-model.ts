import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProjectClient } from '../lib/client';
import { spec } from '../spec';

export let getProjectModel = SlateTool.create(spec, {
  name: 'Get Project Model',
  key: 'get_project_model',
  description: `Retrieve the full JSON representation of a Plasmic project structure via the Model API. Returns all components, pages, design tokens, metadata, A/B tests, custom targets, and scheduled content. The response includes element trees (TplNodes) for each component.`,
  instructions: [
    'The response includes a `site` root object with `components` and `splits` arrays.',
    'Each component contains a `tplTree` with the element tree structure.',
    'TplNodes are either TplTags (HTML elements) or TplComponents (component instances).'
  ],
  constraints: [
    'The model schema may evolve — this API is considered experimental by Plasmic.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mode: z
        .enum(['preview', 'published', 'versioned'])
        .default('published')
        .describe('Data retrieval mode'),
      version: z.string().optional().describe('Version number when using versioned mode')
    })
  )
  .output(
    z.object({
      model: z
        .record(z.string(), z.unknown())
        .describe('Full JSON representation of the project model')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.projectId || !ctx.auth.projectToken) {
      throw new Error(
        'Project ID and project token are required to retrieve the project model'
      );
    }

    let client = new ProjectClient({
      projectId: ctx.auth.projectId,
      projectToken: ctx.auth.projectToken
    });

    let result = await client.getProjectModel({
      mode: ctx.input.mode,
      version: ctx.input.version
    });

    return {
      output: { model: result },
      message: `Retrieved project model in **${ctx.input.mode}** mode.`
    };
  })
  .build();
