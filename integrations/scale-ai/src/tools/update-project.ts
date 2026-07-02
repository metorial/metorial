import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update a Scale AI project's parameters, instructions, or ontology. Use this to modify default task parameters or set/update the project's labeling ontology.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectName: z.string().describe('Name of the project to update'),
      instruction: z.string().optional().describe('Updated instruction text for the project'),
      patch: z
        .boolean()
        .optional()
        .describe('If true, merges with existing parameters instead of replacing them'),
      additionalParams: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional parameter key-value pairs to set on the project'),
      ontology: z
        .object({
          name: z.string().describe('Ontology version identifier'),
          labels: z.array(z.any()).describe('List of ontology labels/choices')
        })
        .optional()
        .describe('Set or update the project ontology')
    })
  )
  .output(
    z
      .object({
        projectName: z.string().describe('Name of the updated project'),
        updated: z.boolean().describe('Whether the update succeeded')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    if (
      ctx.input.instruction !== undefined ||
      ctx.input.patch !== undefined ||
      ctx.input.additionalParams
    ) {
      let params: Record<string, any> = {};
      if (ctx.input.patch !== undefined) params.patch = ctx.input.patch;
      if (ctx.input.instruction !== undefined) params.instruction = ctx.input.instruction;
      if (ctx.input.additionalParams) {
        Object.assign(params, ctx.input.additionalParams);
      }
      result = await client.updateProjectParams(ctx.input.projectName, params);
    }

    if (ctx.input.ontology) {
      result = await client.setProjectOntology(ctx.input.projectName, {
        name: ctx.input.ontology.name,
        ontology: ctx.input.ontology.labels
      });
    }

    return {
      output: {
        projectName: ctx.input.projectName,
        updated: true,
        ...result
      },
      message: `Updated project **${ctx.input.projectName}**.`
    };
  })
  .build();
