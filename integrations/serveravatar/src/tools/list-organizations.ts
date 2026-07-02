import { SlateTool } from 'slates';
import { z } from 'zod';
import { ServerAvatarClient } from '../lib/client';
import { spec } from '../spec';

export let listOrganizations = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description: `Retrieve all organizations in your ServerAvatar account. Organizations are the top-level container for all resources including servers, applications, and databases.
Use this to discover available organization IDs needed for other operations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      organizations: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of organizations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ServerAvatarClient({ token: ctx.auth.token });
    let organizations = await client.listOrganizations();

    return {
      output: { organizations },
      message: `Found **${organizations.length}** organization(s).`
    };
  })
  .build();
