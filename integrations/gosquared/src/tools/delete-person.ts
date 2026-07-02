import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoSquaredClient } from '../lib/client';
import { spec } from '../spec';

export let deletePerson = SlateTool.create(spec, {
  name: 'Delete Person',
  key: 'delete_person',
  description: `Permanently delete a person's profile and all associated data from GoSquared People CRM. Optionally blacklist the person to prevent re-creation and block webhooks/integrations for them.`,
  constraints: ['This action is irreversible. Deleted data cannot be recovered.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      personId: z.string().describe('The person ID to delete'),
      blacklist: z
        .boolean()
        .optional()
        .describe(
          'If true, prevents the profile from being recreated and blocks webhooks/integrations for this person'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoSquaredClient({
      token: ctx.auth.token,
      siteToken: ctx.config.siteToken
    });

    await client.deletePerson(ctx.input.personId, ctx.input.blacklist);

    return {
      output: { success: true },
      message: `Successfully deleted person **${ctx.input.personId}**${ctx.input.blacklist ? ' and added to blacklist' : ''}.`
    };
  })
  .build();
