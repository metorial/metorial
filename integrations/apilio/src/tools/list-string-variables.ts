import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listStringVariables = SlateTool.create(spec, {
  name: 'List String Variables',
  key: 'list_string_variables',
  description: `Retrieve all string variables from your Apilio account. String variables store text values used in automation logic, such as current weather status, last triggered device, or custom labels.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      variables: z
        .array(
          z.object({
            variableId: z.string().describe('Unique identifier of the string variable'),
            name: z.string().describe('Name of the string variable'),
            value: z
              .string()
              .nullable()
              .describe('Current value of the variable, or null if cleared'),
            createdAt: z.string().describe('When the variable was created'),
            updatedAt: z.string().describe('When the variable was last updated')
          })
        )
        .describe('List of all string variables')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let variables = await client.listStringVariables();

    let mapped = variables.map(v => ({
      variableId: v.id,
      name: v.name,
      value: v.value,
      createdAt: v.created_at,
      updatedAt: v.updated_at
    }));

    return {
      output: { variables: mapped },
      message: `Found **${mapped.length}** string variable(s).`
    };
  })
  .build();
