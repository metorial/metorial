import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOrganizations = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description: `List all organizations accessible with the current API key. Organizations are the top-level containers that hold workspaces, document types, and team members. Use this to discover organization identifiers needed for workspace and document type operations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      organizations: z
        .array(
          z.object({
            organizationIdentifier: z
              .string()
              .describe('Unique identifier of the organization.'),
            name: z.string().optional().describe('Name of the organization.'),
            isTrial: z.boolean().optional().describe('Whether this is a trial account.'),
            resthookSignatureKey: z
              .string()
              .optional()
              .describe('Signature key for verifying webhook payloads.')
          })
        )
        .describe('List of accessible organizations.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listOrganizations();
    let organizations = (Array.isArray(result) ? result : (result.results ?? [])).map(
      (org: any) => ({
        organizationIdentifier: org.identifier ?? '',
        name: org.name,
        isTrial: org.isTrial,
        resthookSignatureKey: org.resthookSignatureKey
      })
    );

    return {
      output: { organizations },
      message: `Found **${organizations.length}** organization(s).`
    };
  })
  .build();
