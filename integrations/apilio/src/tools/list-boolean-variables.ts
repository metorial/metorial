import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBooleanVariables = SlateTool.create(spec, {
  name: 'List Boolean Variables',
  key: 'list_boolean_variables',
  description: `Retrieve all boolean variables from your Apilio account. Boolean variables store true/false states used in automation conditions, such as whether it is nighttime, if a door is open, or if you are home.`,
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
            variableId: z.string().describe('Unique identifier of the boolean variable'),
            name: z.string().describe('Name of the boolean variable'),
            value: z.boolean().describe('Current value of the variable'),
            createdAt: z.string().describe('When the variable was created'),
            updatedAt: z.string().describe('When the variable was last updated')
          })
        )
        .describe('List of all boolean variables')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let variables = await client.listBooleanVariables();

    let mapped = variables.map(v => ({
      variableId: v.id,
      name: v.name,
      value: v.value,
      createdAt: v.created_at,
      updatedAt: v.updated_at
    }));

    return {
      output: { variables: mapped },
      message: `Found **${mapped.length}** boolean variable(s).`
    };
  })
  .build();
