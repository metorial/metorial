import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listIdentities = SlateTool.create(spec, {
  name: 'List Identities',
  key: 'list_identities',
  description: `List all connected identities in your La Growth Machine account. Identities represent connected LinkedIn, email, or Twitter accounts used to send messages and perform outreach.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      identities: z.array(z.any()).describe('List of connected identity records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listIdentities();

    let identities = Array.isArray(result) ? result : (result?.identities ?? [result]);

    return {
      output: { identities },
      message: `Retrieved **${identities.length}** connected identity(ies).`
    };
  })
  .build();
