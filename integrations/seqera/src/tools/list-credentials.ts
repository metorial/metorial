import { SlateTool } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listCredentials = SlateTool.create(spec, {
  name: 'List Credentials',
  key: 'list_credentials',
  description: `List credentials stored in a workspace. Credentials are encrypted access keys for compute environments, code repositories, and external services. Does not expose credential values.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      platformId: z
        .string()
        .optional()
        .describe(
          'Filter by platform (e.g., aws, google, azure, github, gitlab, bitbucket, ssh, k8s)'
        )
    })
  )
  .output(
    z.object({
      credentials: z
        .array(
          z.object({
            credentialsId: z.string().optional().describe('Credentials ID'),
            name: z.string().optional().describe('Credentials name'),
            description: z.string().optional().describe('Description'),
            provider: z.string().optional().describe('Credential provider type'),
            dateCreated: z.string().optional().describe('Creation date'),
            lastUpdated: z.string().optional().describe('Last updated date'),
            lastUsed: z.string().optional().describe('Last used date')
          })
        )
        .describe('List of credentials')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SeqeraClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      workspaceId: ctx.input.workspaceId ?? ctx.config.workspaceId
    });

    let creds = await client.listCredentials({
      platformId: ctx.input.platformId
    });

    let credentials = creds.map(c => ({
      credentialsId: c.id ?? undefined,
      name: c.name ?? undefined,
      description: c.description ?? undefined,
      provider: c.provider ?? undefined,
      dateCreated: c.dateCreated ?? undefined,
      lastUpdated: c.lastUpdated ?? undefined,
      lastUsed: c.lastUsed ?? undefined
    }));

    return {
      output: { credentials },
      message: `Found **${credentials.length}** credentials.`
    };
  })
  .build();
