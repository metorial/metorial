import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createLocation = SlateTool.create(spec, {
  name: 'Create Location',
  key: 'create_location',
  description: `Create a new work location in TalentHR. Locations represent physical offices or sites where employees work and can be assigned to employees.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the location to create')
    })
  )
  .output(
    z.object({
      locationId: z.number().describe('ID of the created location'),
      name: z.string().describe('Name of the created location'),
      rawResponse: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.createLocation(ctx.input.name);

    return {
      output: {
        locationId: response.data.id,
        name: ctx.input.name,
        rawResponse: response
      },
      message: `Successfully created location **${ctx.input.name}**.`
    };
  })
  .build();
