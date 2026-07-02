import { SlateTool } from 'slates';
import { z } from 'zod';
import { CloudAgentsClient } from '../lib/client';
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
      userEmail: z.string().describe('Email associated with the API key'),
      createdAt: z.string().describe('ISO 8601 timestamp of when the key was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CloudAgentsClient({ token: ctx.auth.token });
    let result = await client.getApiKeyInfo();

    return {
      output: {
        apiKeyName: result.apiKeyName,
        userEmail: result.userEmail,
        createdAt: result.createdAt
      },
      message: `API key **${result.apiKeyName}** belongs to \`${result.userEmail}\`.`
    };
  })
  .build();
