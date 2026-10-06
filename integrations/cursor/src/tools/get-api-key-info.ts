import { SlateTool } from 'slates';
import { z } from 'zod';
import { CurrentAgentsClient } from '../lib/current-client';
import { spec } from '../spec';

export let getApiKeyInfo = SlateTool.create(spec, {
  name: 'Get API Key Info',
  key: 'get_api_key_info',
  description: `Retrieve information about the authenticated API key, including the associated user email and key metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      apiKeyName: z.string().describe('Name of the API key'),
      userEmail: z.string().optional().describe('Owner email, when the key is user-scoped'),
      userId: z.number().optional().describe('Numeric owner ID, when the key is user-scoped'),
      createdAt: z.string().describe('ISO 8601 timestamp of when the key was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CurrentAgentsClient({ token: ctx.auth.token });
    let result = await client.getApiKeyInfo();

    return {
      output: {
        apiKeyName: result.apiKeyName,
        userEmail: result.userEmail,
        userId: result.userId,
        createdAt: result.createdAt
      },
      message: `API key **${result.apiKeyName}**${result.userEmail ? ` belongs to ${result.userEmail}` : ' is not tied to an individual user'}.`
    };
  })
  .build();
