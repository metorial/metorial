import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProcFuClient } from '../lib/client';
import { spec } from '../spec';

export let listPodioOrganizations = SlateTool.create(spec, {
  name: 'List Podio Organizations',
  key: 'list_podio_organizations',
  description:
    'Get the connected user’s Podio organizations and workspace summaries, including IDs and names. Pass a workspace ID to get_podio_app_info with list_apps to discover its apps.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      organizations: z
        .any()
        .describe('The full Podio organization and workspace discovery response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ProcFuClient({ token: ctx.auth.token });
    let organizations = await client.getOrganizations();
    return {
      output: { organizations },
      message: 'Retrieved Podio organizations and workspace summaries.'
    };
  })
  .build();
