import { SlateTool } from 'slates';
import { z } from 'zod';
import { DuoClient } from '../lib/client';
import { spec } from '../spec';

export let listIntegrations = SlateTool.create(spec, {
  name: 'List Integrations',
  key: 'list_integrations',
  description: `Retrieve a list of Duo-protected applications (integrations). Each integration represents an application that uses Duo for authentication.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of integrations to return (default 100)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      integrations: z.array(
        z.object({
          integrationKey: z.string(),
          name: z.string(),
          type: z.string().optional(),
          adminApiAdmins: z.number().optional(),
          groupsAllowed: z.array(z.any()).optional(),
          notesHtml: z.string().optional(),
          selfServiceAllowed: z.boolean().optional(),
          usernameNormalizationPolicy: z.string().optional()
        })
      ),
      totalObjects: z.number().optional(),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DuoClient({
      integrationKey: ctx.auth.integrationKey,
      secretKey: ctx.auth.secretKey,
      apiHostname: ctx.auth.apiHostname
    });

    let result = await client.listIntegrations({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let integrations = (result.response || []).map((i: any) => ({
      integrationKey: i.integration_key,
      name: i.name,
      type: i.type || undefined,
      adminApiAdmins: i.adminapi_admins,
      groupsAllowed: i.groups_allowed,
      notesHtml: i.notes || undefined,
      selfServiceAllowed: i.self_service_allowed,
      usernameNormalizationPolicy: i.username_normalization_policy || undefined
    }));

    let totalObjects = result.metadata?.total_objects;
    let hasMore =
      totalObjects !== undefined
        ? (ctx.input.offset ?? 0) + integrations.length < totalObjects
        : false;

    return {
      output: { integrations, totalObjects, hasMore },
      message: `Found **${integrations.length}** integration(s).`
    };
  })
  .build();
