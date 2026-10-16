import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Validate the connected API key and retrieve the associated user email address.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      email: z.string().describe('Email address associated with the API key'),
      status: z.string().describe('Validation status returned by Remote Retrieval'),
      message: z.string().describe('Validation message returned by Remote Retrieval'),
      responseCode: z.number().describe('Response code returned by Remote Retrieval')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).validateUser();
    return {
      output: {
        email: result.email,
        status: result.status,
        message: result.message,
        responseCode: result.response_code
      },
      message: `Connected as **${result.email}**.`
    };
  })
  .build();
