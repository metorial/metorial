import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listNumericVariables = SlateTool.create(spec, {
  name: 'List Numeric Variables',
  key: 'list_numeric_variables',
  description: `Retrieve all numeric variables from your Apilio account. Numeric variables store number values used in automation logic, such as temperature readings, motion counts, or sensor thresholds.`,
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
            variableId: z.string().describe('Unique identifier of the numeric variable'),
            name: z.string().describe('Name of the numeric variable'),
            value: z.number().describe('Current numeric value'),
            createdAt: z.string().describe('When the variable was created'),
            updatedAt: z.string().describe('When the variable was last updated')
          })
        )
        .describe('List of all numeric variables')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let variables = await client.listNumericVariables();

    let mapped = variables.map(v => ({
      variableId: v.id,
      name: v.name,
      value: v.value,
      createdAt: v.created_at,
      updatedAt: v.updated_at
    }));

    return {
      output: { variables: mapped },
      message: `Found **${mapped.length}** numeric variable(s).`
    };
  })
  .build();
