import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getActionOutputFields = SlateTool.create(spec, {
  name: 'Get Action Output Fields',
  key: 'get_action_output_fields',
  description: `Retrieve the output fields produced by a specific Zapier action. Output fields can be mapped into later Zap steps or used to preview the result shape before creating a Zap.`,
  instructions: [
    'Pass the same authentication and current inputs you plan to use for the step.',
    'Use this after choosing an action and filling required inputs to understand what data later steps can reference.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      actionId: z.string().describe('Action ID from the /v2/actions endpoint'),
      authenticationId: z
        .string()
        .nullable()
        .describe('Authentication ID to use for resolving output fields'),
      currentInputs: z
        .record(z.string(), z.any())
        .optional()
        .describe('Current input field values for resolving dynamic output fields')
    })
  )
  .output(
    z.object({
      fields: z.array(z.any()).describe('Array of output field definitions'),
      totalCount: z.number().describe('Total number of output fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.getOutputFields(ctx.input.actionId, {
      authentication: ctx.input.authenticationId,
      inputs: ctx.input.currentInputs || {}
    });

    return {
      output: {
        fields: response.data,
        totalCount: response.meta.count
      },
      message: `Retrieved **${response.meta.count}** output field(s) for action \`${ctx.input.actionId}\`.`
    };
  })
  .build();
