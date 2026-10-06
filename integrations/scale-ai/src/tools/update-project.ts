import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update a Scale AI project's default task parameters and instructions. Project-level parameters apply to future tasks.`,
  instructions: [
    'Publish taxonomy changes in the Scale dashboard. The legacy ontology input is unavailable through the documented API and must be omitted.'
  ],
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
        .describe(
          'If true, retains unspecified parameters. Supplied arrays and objects replace their previous values. Defaults to false, replacing all parameters.'
        ),
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
        .describe(
          'Deprecated and unavailable through the documented API. Omit this field and publish taxonomy changes in the Scale dashboard.'
        )
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
    if (ctx.input.ontology !== undefined) {
      throw createApiServiceError(
        'Ontology updates are unavailable through the documented Scale API. Publish taxonomy changes in the Scale dashboard and omit ontology.'
      );
    }
    if (ctx.input.instruction === undefined && ctx.input.additionalParams === undefined) {
      throw createApiServiceError(
        'Provide instruction or additionalParams to update the project.'
      );
    }
    let client = new Client({ token: ctx.auth.token });
    let params: Record<string, unknown> = { ...ctx.input.additionalParams };
    if (ctx.input.patch !== undefined) params.patch = ctx.input.patch;
    if (ctx.input.instruction !== undefined) params.instruction = ctx.input.instruction;
    let result = await client.updateProjectParams(ctx.input.projectName, params);

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
