import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { microsoftTeamsActionScopes } from '../scopes';
import { spec } from '../spec';

export let createTeam = SlateTool.create(spec, {
  name: 'Create Team',
  key: 'create_team',
  description: `Create a new Microsoft Team. The team is provisioned asynchronously; the response includes a tracking URL. You can specify visibility, description, and member/messaging settings.`,
  tags: {
    destructive: false
  }
})
  .scopes(microsoftTeamsActionScopes.createTeam)
  .input(
    z.object({
      displayName: z.string().describe('Display name for the new team'),
      description: z.string().optional().describe('Description for the team'),
      visibility: z.enum(['public', 'private']).optional().describe('Team visibility'),
      ownerUserId: z
        .string()
        .optional()
        .describe(
          'User ID of the team owner. If not provided, the authenticated user becomes the owner.'
        )
    })
  )
  .output(
    z.object({
      teamId: z
        .string()
        .optional()
        .describe('ID of the created team (may not be immediately available)'),
      operationUrl: z
        .string()
        .optional()
        .describe('URL to track the async provisioning operation'),
      status: z.string().describe('Current status of team creation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient({ token: ctx.auth.token });

    let body: any = {
      'template@odata.bind': "https://graph.microsoft.com/v1.0/teamsTemplates('standard')",
      displayName: ctx.input.displayName,
      description: ctx.input.description || ''
    };

    if (ctx.input.visibility) {
      body.visibility = ctx.input.visibility;
    }

    if (ctx.input.ownerUserId) {
      body.members = [
        {
          '@odata.type': '#microsoft.graph.aadUserConversationMember',
          roles: ['owner'],
          'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${ctx.input.ownerUserId}')`
        }
      ];
    }

    let result = await client.createTeam(body);

    return {
      output: result,
      message: `Team **${ctx.input.displayName}** creation initiated. Status: ${result.status}.`
    };
  })
  .build();
