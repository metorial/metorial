import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let showModel = SlateTool.create(spec, {
  name: 'Show Model',
  key: 'show_model',
  description: `Retrieve detailed information about a specific model, including template, system prompt, parameters, license, capabilities, architecture details, and verbose metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modelName: z
        .string()
        .describe('Name of the model to show (e.g., "llama3.2", "gemma3:latest").'),
      verbose: z
        .boolean()
        .optional()
        .describe('Include verbose model info with additional metadata fields.')
    })
  )
  .output(
    z.object({
      modelfile: z.string().optional().describe('The Modelfile content for the model.'),
      parameters: z.string().optional().describe('Model parameters.'),
      template: z.string().optional().describe('Prompt template used by the model.'),
      system: z.string().optional().describe('System prompt configured for the model.'),
      license: z.string().optional().describe('License information.'),
      modifiedAt: z.string().optional().describe('ISO 8601 timestamp of last modification.'),
      capabilities: z
        .array(z.string())
        .optional()
        .describe('Model capabilities such as completion, vision, or tools.'),
      details: z
        .object({
          parentModel: z.string().optional().describe('Parent model this was derived from.'),
          format: z.string().optional().describe('Model file format.'),
          family: z.string().optional().describe('Model architecture family.'),
          families: z.array(z.string()).optional().describe('All applicable model families.'),
          parameterSize: z.string().optional().describe('Approximate parameter count.'),
          quantizationLevel: z.string().optional().describe('Quantization level.')
        })
        .describe('Model details and specifications.'),
      modelInfo: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional verbose model metadata.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.showModel(ctx.input.modelName, ctx.input.verbose);

    let familyInfo = result.details.family ? ` (${result.details.family})` : '';
    let sizeInfo = result.details.parameterSize
      ? `, ${result.details.parameterSize} parameters`
      : '';
    let capabilityInfo = result.capabilities?.length
      ? ` Capabilities: ${result.capabilities.join(', ')}.`
      : '';

    return {
      output: result,
      message: `Model **${ctx.input.modelName}**${familyInfo}${sizeInfo}.${capabilityInfo}`
    };
  })
  .build();
