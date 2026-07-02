import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient, createTransformation } from '../lib/client';
import { spec } from '../spec';

export let createTransformationTool = SlateTool.create(spec, {
  name: 'Create Transformation',
  key: 'create_transformation',
  description: `Create a new transformation in VectorShift. Transformations allow you to run arbitrary code in an isolated execution environment. Define the function code, input/output schemas, and metadata.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the transformation'),
      description: z.string().describe('Description of what the transformation does'),
      functionName: z.string().describe('Function identifier name'),
      functionCode: z.string().describe('Function code/implementation'),
      inputSchema: z
        .record(z.string(), z.unknown())
        .describe('Input schema with property definitions'),
      outputSchema: z
        .record(z.string(), z.unknown())
        .describe('Output schema with property definitions')
    })
  )
  .output(
    z.object({
      transformationId: z.string().describe('ID of the newly created transformation')
    })
  )
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);
    let result = await createTransformation(api, {
      name: ctx.input.name,
      description: ctx.input.description,
      functionName: ctx.input.functionName,
      functionCode: ctx.input.functionCode,
      inputSchema: ctx.input.inputSchema,
      outputSchema: ctx.input.outputSchema
    });

    return {
      output: {
        transformationId: result.id
      },
      message: `Transformation **${ctx.input.name}** created with ID \`${result.id}\`.`
    };
  })
  .build();
