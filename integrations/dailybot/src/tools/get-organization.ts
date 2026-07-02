import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let getOrganization = SlateTool.create(spec, {
  name: 'Get Organization',
  key: 'get_organization',
  description: `Retrieve organization-level information including name, connected chat platform, supported domains, and platform configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      organizationUuid: z.string().describe('UUID of the organization'),
      name: z.string().describe('Name of the organization'),
      platform: z
        .string()
        .optional()
        .describe('Connected chat platform (e.g., Slack, Microsoft Teams)'),
      raw: z.any().describe('Full organization object from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    let org = await client.getOrganization();

    return {
      output: {
        organizationUuid: org.uuid,
        name: org.name,
        platform: org.platform ?? org.chat_platform,
        raw: org
      },
      message: `Organization: **${org.name}**.`
    };
  })
  .build();
