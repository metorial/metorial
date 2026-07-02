import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTrustedEntities = SlateTool.create(spec, {
  name: 'List Trusted Entities',
  key: 'list_trusted_entities',
  description: `Retrieve trusted entities configured in a Paradym project. Trusted entities define which issuers (identified by DIDs or X.509 certificates) are accepted during credential verification.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageSize: z.number().optional().describe('Number of entities to return per page'),
      pageAfter: z.string().optional().describe('Cursor for fetching the next page of results')
    })
  )
  .output(
    z.object({
      entities: z
        .array(
          z.object({
            trustedEntityId: z.string().describe('ID of the trusted entity'),
            name: z.string().describe('Entity name'),
            dids: z.array(z.string()).optional().describe('Trusted DIDs'),
            certificates: z
              .array(z.string())
              .optional()
              .describe('Trusted X.509 certificates'),
            createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
          })
        )
        .describe('List of trusted entities')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let result = await client.listTrustedEntities({
      pageSize: ctx.input.pageSize,
      pageAfter: ctx.input.pageAfter
    });

    let entities = (result.data ?? []).map((e: any) => ({
      trustedEntityId: e.id,
      name: e.name,
      dids: e.dids,
      certificates: e.certificates,
      createdAt: e.createdAt
    }));

    return {
      output: { entities },
      message: `Found **${entities.length}** trusted entity(ies).`
    };
  })
  .build();
