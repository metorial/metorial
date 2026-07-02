import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listStacks = SlateTool.create(spec, {
  name: 'List Stacks',
  key: 'list_stacks',
  description: `List all Pulumi stacks accessible to the authenticated user. Optionally filter by organization, project, or tags. Returns stack names, resource counts, and last update timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organization: z.string().optional().describe('Filter stacks by organization name'),
      project: z.string().optional().describe('Filter stacks by project name'),
      tagName: z.string().optional().describe('Filter stacks by tag name'),
      tagValue: z
        .string()
        .optional()
        .describe('Filter stacks by tag value (requires tagName)'),
      continuationToken: z
        .string()
        .optional()
        .describe('Pagination token from a previous response')
    })
  )
  .output(
    z.object({
      stacks: z.array(
        z.object({
          organizationName: z.string(),
          projectName: z.string(),
          stackName: z.string(),
          lastUpdate: z.number().optional(),
          resourceCount: z.number().optional()
        })
      ),
      continuationToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let org = ctx.input.organization || ctx.config.organization;

    let result = await client.listStacks({
      organization: org,
      project: ctx.input.project,
      tagName: ctx.input.tagName,
      tagValue: ctx.input.tagValue,
      continuationToken: ctx.input.continuationToken
    });

    let stacks = (result.stacks || []).map((s: any) => ({
      organizationName: s.orgName,
      projectName: s.projectName,
      stackName: s.stackName,
      lastUpdate: s.lastUpdate,
      resourceCount: s.resourceCount
    }));

    return {
      output: {
        stacks,
        continuationToken: result.continuationToken
      },
      message: `Found **${stacks.length}** stack(s)${org ? ` in organization **${org}**` : ''}${ctx.input.project ? ` under project **${ctx.input.project}**` : ''}.${result.continuationToken ? ' More results available with continuation token.' : ''}`
    };
  })
  .build();
