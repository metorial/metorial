import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let connectionSchema = z.object({
  connectionId: z.string().describe('Unique connection identifier'),
  handle: z.string().describe('Connection handle'),
  plugin: z.string().optional().describe('Plugin name (e.g. aws, azure, gcp)'),
  type: z.string().optional().describe('Connection type (connection or aggregator)'),
  credentialSource: z.string().optional().describe('Credential source (self or integration)'),
  state: z.string().optional().describe('Connection state'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listConnections = SlateTool.create(spec, {
  name: 'List Connections',
  key: 'list_connections',
  description: `List connections for a user or organization. Connections provide credentials and configuration for interacting with external systems like AWS, Azure, GCP, and other cloud providers.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scope: z
        .enum(['user', 'org'])
        .default('user')
        .describe('Whether to list user or organization connections'),
      ownerHandle: z
        .string()
        .optional()
        .describe('Owner handle (user or org). Defaults to the authenticated user.'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      nextToken: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      connections: z.array(connectionSchema).describe('List of connections'),
      nextToken: z.string().optional().describe('Pagination cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let ownerHandle = ctx.input.ownerHandle;
    if (!ownerHandle) {
      let actor = await client.getActor();
      ownerHandle = actor.handle;
    }

    let result: any;
    if (ctx.input.scope === 'org') {
      result = await client.listOrgConnections(ownerHandle, {
        limit: ctx.input.limit,
        nextToken: ctx.input.nextToken
      });
    } else {
      result = await client.listUserConnections(ownerHandle, {
        limit: ctx.input.limit,
        nextToken: ctx.input.nextToken
      });
    }

    return {
      output: {
        connections: result.items,
        nextToken: result.nextToken
      },
      message: `Found **${result.items.length}** connection(s)${result.nextToken ? ' (more available)' : ''}.`
    };
  })
  .build();
