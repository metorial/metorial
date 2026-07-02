import { SlateTool } from 'slates';
import { z } from 'zod';
import { CabinPandaClient } from '../lib/client';
import { spec } from '../spec';

export let getIntegration = SlateTool.create(spec, {
  name: 'Get Integration',
  key: 'get_integration',
  description: `Retrieve details of a specific integration by its ID. Returns configuration and status of the integration connecting a form to an external service.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      integrationId: z.string().describe('The numeric ID of the integration to retrieve')
    })
  )
  .output(
    z.object({
      integrationId: z.string().optional().describe('Unique identifier for the integration'),
      name: z.string().optional().describe('Name of the integration'),
      type: z.string().optional().describe('Type of integration'),
      formId: z
        .string()
        .optional()
        .describe('ID of the form this integration is connected to'),
      status: z.string().optional().describe('Current status of the integration'),
      raw: z.any().optional().describe('Full integration object from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CabinPandaClient({ token: ctx.auth.token });
    let integ = await client.getIntegration(ctx.input.integrationId);

    return {
      output: {
        integrationId: integ?.id?.toString(),
        name: integ?.name,
        type: integ?.type,
        formId: integ?.form_id?.toString() ?? integ?.form_key,
        status: integ?.status,
        raw: integ
      },
      message: `Retrieved integration **${integ?.name ?? ctx.input.integrationId}**.`
    };
  })
  .build();
