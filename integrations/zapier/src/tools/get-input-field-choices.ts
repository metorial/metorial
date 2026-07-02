import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let normalizeChoicesResponse = (response: any) => {
  let source =
    Array.isArray(response) && response.length === 1 && Array.isArray(response[0]?.data)
      ? response[0]
      : response;

  let choices = Array.isArray(source?.data) ? source.data : [];
  let totalCount =
    typeof source?.meta?.count === 'number'
      ? source.meta.count
      : typeof source?.meta?.page === 'number'
        ? choices.length
        : choices.length;

  return {
    choices,
    totalCount,
    page: typeof source?.meta?.page === 'number' ? source.meta.page : undefined
  };
};

export let getInputFieldChoices = SlateTool.create(spec, {
  name: 'Get Input Field Choices',
  key: 'get_input_field_choices',
  description: `Retrieve available choices for a SELECT input field on a Zapier action. Use this for dynamic dropdown fields such as folders, sheets, channels, lists, projects, or other provider-specific options.`,
  instructions: [
    'Call Get Action Input Fields first, then pass the field ID for a SELECT field.',
    'Pass current inputs when the choices depend on earlier field values.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      actionId: z.string().describe('Action ID from the /v2/actions endpoint'),
      fieldId: z.string().describe('Input field ID from Get Action Input Fields'),
      authenticationId: z
        .string()
        .nullable()
        .describe('Authentication ID to use for resolving choices'),
      currentInputs: z
        .record(z.string(), z.any())
        .optional()
        .describe('Current input field values for resolving dependent choices'),
      page: z
        .number()
        .optional()
        .describe('Choice page to return when Zapier paginates SELECT choices')
    })
  )
  .output(
    z.object({
      choices: z.array(z.any()).describe('Array of available choices for the field'),
      totalCount: z.number().describe('Number of choices returned'),
      page: z.number().optional().describe('Choice page number when returned by Zapier')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.getChoices(ctx.input.actionId, ctx.input.fieldId, {
      authentication: ctx.input.authenticationId,
      inputs: ctx.input.currentInputs || {},
      page: ctx.input.page
    });

    let normalized = normalizeChoicesResponse(response);

    return {
      output: normalized,
      message: `Retrieved **${normalized.choices.length}** choice(s) for field \`${ctx.input.fieldId}\` on action \`${ctx.input.actionId}\`.`
    };
  })
  .build();
