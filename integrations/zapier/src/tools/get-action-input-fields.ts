import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getActionInputFields = SlateTool.create(spec, {
  name: 'Get Action Input Fields',
  key: 'get_action_input_fields',
  description: `Retrieve the input fields required for a specific action. Returns field definitions including types, labels, whether they're required, and available choices.
Use this to discover what inputs are needed before creating a Zap step or testing an action. Some fields may depend on the values of other fields.`,
  instructions: [
    'Pass current input values in the inputs parameter to resolve dependent fields.',
    'Fields may be of type InputField, InfoField, or Fieldset.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      actionId: z
        .string()
        .describe('Action ID from the /v2/actions endpoint, e.g. "uag:87b1c14e-..."'),
      authenticationId: z
        .string()
        .nullable()
        .describe('Authentication ID to use for resolving dynamic fields'),
      currentInputs: z
        .record(z.string(), z.any())
        .optional()
        .describe('Current input field values for resolving dependent fields')
    })
  )
  .output(
    z.object({
      fields: z.array(z.any()).describe('Array of input field definitions'),
      totalCount: z.number().describe('Total number of fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.getInputFields(ctx.input.actionId, {
      authentication: ctx.input.authenticationId,
      inputs: ctx.input.currentInputs || {}
    });

    return {
      output: {
        fields: response.data,
        totalCount: response.meta.count
      },
      message: `Retrieved **${response.meta.count}** input field(s) for action \`${ctx.input.actionId}\`.`
    };
  })
  .build();
