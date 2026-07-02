import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDivision = SlateTool.create(spec, {
  name: 'Create Division',
  key: 'create_division',
  description: `Create a new division in TalentHR. Divisions represent major organizational segments such as regions or business units.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the division to create')
    })
  )
  .output(
    z.object({
      divisionId: z.number().describe('ID of the created division'),
      name: z.string().describe('Name of the created division'),
      rawResponse: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.createDivision(ctx.input.name);

    return {
      output: {
        divisionId: response.data.id,
        name: ctx.input.name,
        rawResponse: response
      },
      message: `Successfully created division **${ctx.input.name}**.`
    };
  })
  .build();
