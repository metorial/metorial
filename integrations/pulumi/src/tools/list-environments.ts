import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, connectionApiBaseUrl, organization } from '../lib/client';
import { organizationInput } from '../lib/schemas';
import { spec } from '../spec';

export let listEnvironments = SlateTool.create(spec, {
  name: 'List Environments',
  key: 'list_environments',
  description: `List all Pulumi ESC environments in an organization. Returns environment names, projects, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organization: organizationInput,
      continuationToken: z
        .string()
        .optional()
        .describe('Request one page starting at this token'),
      maxResults: z
        .number()
        .optional()
        .describe('Positive page size; omit both paging fields to retrieve all pages.')
    })
  )
  .output(
    z.object({
      environments: z.array(
        z.object({
          organizationName: z.string().optional(),
          projectName: z.string().optional(),
          environmentName: z.string().optional(),
          created: z.string().optional(),
          modified: z.string().optional()
        })
      ),
      nextToken: z.string().optional(),
      returnedCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: connectionApiBaseUrl(ctx.auth, ctx.config)
    });

    let org = organization(ctx.input.organization, ctx.config.organization);

    let result = await client.listEnvironments(
      org,
      ctx.input.continuationToken,
      ctx.input.maxResults
    );

    let environments = result.environments.map(e => ({
      organizationName: e.organization,
      projectName: e.project,
      environmentName: e.name,
      created: e.created,
      modified: e.modified
    }));

    return {
      output: {
        environments,
        nextToken: result.nextToken,
        returnedCount: environments.length
      },
      message: `Found **${environments.length}** environment(s) in organization **${org}**`
    };
  })
  .build();
