import { createApiServiceError, isApiErrorRecord, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve available identity fields for the account connected to the Sidetracker API key. Fields are included only when returned with a supported value type.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      profile: z
        .object({
          id: z
            .union([z.string(), z.number()])
            .optional()
            .describe('Account ID, when returned as a string or number'),
          name: z.string().optional().describe('Account name, when returned as a string'),
          username: z.string().optional().describe('Username, when returned as a string'),
          email: z.string().optional().describe('Email address, when returned as a string'),
          first_name: z.string().optional().describe('First name, when returned as a string'),
          last_name: z.string().optional().describe('Last name, when returned as a string')
        })
        .describe(
          'Available flat identity fields; the provider does not document which fields are returned'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.getCurrentUser();
    if (!isApiErrorRecord(response)) {
      throw createApiServiceError('Sidetracker returned an invalid account response.', {
        reason: 'sidetracker_invalid_account_response'
      });
    }
    let profile = pickDefined({
      id:
        typeof response.id === 'string' ||
        (typeof response.id === 'number' && Number.isFinite(response.id))
          ? response.id
          : undefined,
      name: typeof response.name === 'string' ? response.name : undefined,
      username: typeof response.username === 'string' ? response.username : undefined,
      email: typeof response.email === 'string' ? response.email : undefined,
      first_name: typeof response.first_name === 'string' ? response.first_name : undefined,
      last_name: typeof response.last_name === 'string' ? response.last_name : undefined
    });
    return {
      output: { profile },
      message: 'Retrieved available Sidetracker account identity fields.'
    };
  })
  .build();
