import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { microsoftTeamsActionScopes } from '../scopes';
import { spec } from '../spec';

export let updateTeam = SlateTool.create(spec, {
  name: 'Update Team',
  key: 'update_team',
  description: `Update properties of an existing Microsoft Team such as display name, description, visibility, or settings. Also supports archiving and unarchiving a team.`,
  instructions: [
    'Provide only the fields you want to update; omitted fields will remain unchanged.',
    'To archive or unarchive, set the "action" field accordingly.'
  ]
})
  .scopes(microsoftTeamsActionScopes.updateTeam)
  .input(
    z.object({
      teamId: z.string().describe('ID of the team to update'),
      action: z
        .enum(['update', 'archive', 'unarchive'])
        .default('update')
        .describe('Action to perform on the team'),
      displayName: z.string().optional().describe('New display name'),
      description: z.string().optional().describe('New description'),
      visibility: z.enum(['public', 'private']).optional().describe('New visibility setting')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient({ token: ctx.auth.token });

    if (ctx.input.action === 'archive') {
      await client.archiveTeam(ctx.input.teamId);
      return {
        output: { success: true },
        message: `Team archived successfully.`
      };
    }

    if (ctx.input.action === 'unarchive') {
      await client.unarchiveTeam(ctx.input.teamId);
      return {
        output: { success: true },
        message: `Team unarchived successfully.`
      };
    }

    let body: any = {};
    if (ctx.input.displayName) body.displayName = ctx.input.displayName;
    if (ctx.input.description !== undefined) body.description = ctx.input.description;
    if (ctx.input.visibility) body.visibility = ctx.input.visibility;

    await client.updateTeam(ctx.input.teamId, body);

    return {
      output: { success: true },
      message: `Team updated successfully.`
    };
  })
  .build();
