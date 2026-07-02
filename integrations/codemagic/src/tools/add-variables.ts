import { SlateTool } from 'slates';
import { z } from 'zod';
import { CodemagicClient } from '../lib/client';
import { spec } from '../spec';

export let addVariables = SlateTool.create(spec, {
  name: 'Add Variables to Group',
  key: 'add_variables',
  description: `Add environment variables to an existing variable group. Variables can be marked as secret for encrypted storage. This is for apps configured using codemagic.yaml.`,
  instructions: [
    'The variable group must already exist. Use the Codemagic UI or API to create a group first.',
    'Setting secure to true encrypts the variable values and hides them in the UI and build logs.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      variableGroupId: z.string().describe('ID of the variable group to add variables to'),
      secure: z
        .boolean()
        .optional()
        .describe('Whether to encrypt and hide the variable values (defaults to false)'),
      variables: z
        .array(
          z.object({
            name: z.string().describe('Variable name'),
            value: z.string().describe('Variable value')
          })
        )
        .describe('List of variables to add')
    })
  )
  .output(
    z.object({
      variableGroupId: z.string().describe('ID of the variable group'),
      variablesAdded: z.number().describe('Number of variables added')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CodemagicClient({ token: ctx.auth.token });

    await client.addVariablesToGroup({
      variableGroupId: ctx.input.variableGroupId,
      secure: ctx.input.secure,
      variables: ctx.input.variables
    });

    return {
      output: {
        variableGroupId: ctx.input.variableGroupId,
        variablesAdded: ctx.input.variables.length
      },
      message: `Added **${ctx.input.variables.length}** variable(s) to group \`${ctx.input.variableGroupId}\`${ctx.input.secure ? ' (encrypted)' : ''}.`
    };
  })
  .build();
