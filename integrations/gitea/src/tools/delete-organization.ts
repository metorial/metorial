import { SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { spec } from '../spec';

export const deleteOrganization = SlateTool.create(spec, {
  key: 'delete_organization',
  name: 'Delete Organization',
  description:
    'Permanently delete an empty Gitea organization. Remove its repositories and packages first. Requires organization owner permissions.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      orgName: z
        .string()
        .min(1)
        .describe('Organization name returned by list_organizations or create_organization')
    })
  )
  .output(z.object({ deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await new GiteaClient(ctx.auth).deleteOrg(ctx.input.orgName);
    return {
      output: { deleted: true },
      message: `Deleted organization **${ctx.input.orgName}**.`
    };
  })
  .build();
