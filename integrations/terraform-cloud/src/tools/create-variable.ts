import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { mapVariable } from '../lib/mappers';
import { spec } from '../spec';

export let createVariableTool = SlateTool.create(spec, {
  name: 'Create Variable',
  key: 'create_variable',
  description: `Create a Terraform variable or environment variable in a workspace. Supports HCL-formatted values and marking variables as sensitive to protect secrets.`,
  instructions: [
    'Use category "terraform" for Terraform input variables and "env" for environment variables.',
    'Set sensitive to true for secrets like API keys and passwords — the value cannot be read back once set.'
  ]
})
  .input(
    z.object({
      workspaceId: z.string().describe('The workspace ID to create the variable in'),
      key: z.string().describe('Variable name/key'),
      value: z.string().describe('Variable value'),
      description: z.string().optional().describe('Description of the variable'),
      category: z
        .enum(['terraform', 'env'])
        .describe(
          '"terraform" for Terraform input variables, "env" for environment variables'
        ),
      hcl: z
        .boolean()
        .optional()
        .describe('Whether the value is HCL-formatted (default: false)'),
      sensitive: z
        .boolean()
        .optional()
        .describe('Whether the variable is sensitive (default: false)')
    })
  )
  .output(
    z.object({
      variableId: z.string(),
      key: z.string(),
      value: z.string(),
      description: z.string(),
      category: z.string(),
      hcl: z.boolean(),
      sensitive: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.createVariable(ctx.input.workspaceId, {
      key: ctx.input.key,
      value: ctx.input.value,
      description: ctx.input.description,
      category: ctx.input.category,
      hcl: ctx.input.hcl,
      sensitive: ctx.input.sensitive
    });
    let variable = mapVariable(response.data);

    return {
      output: variable,
      message: `Created ${variable.category} variable **${variable.key}** (${variable.variableId})${variable.sensitive ? ' [sensitive]' : ''}.`
    };
  })
  .build();
