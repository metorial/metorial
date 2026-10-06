import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, mapDeploy } from '../lib/client';
import { spec } from '../spec';

export let listDeploys = SlateTool.create(spec, {
  name: 'List Deploys',
  key: 'list_deploys',
  description: `List deployments reported to Rollbar, optionally filtered by environment within the requested page. An empty filtered page may have later matching deploys. Useful for auditing release history and correlating deploys with error spikes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .number()
        .optional()
        .describe('Project ID from manage_project; required with an account token.'),
      environment: z.string().optional().describe('Filter deploys by environment name'),
      page: z
        .number()
        .optional()
        .describe('Page number for pagination; default page size is 20'),
      limit: z.number().optional().describe('Page size, maximum 5000')
    })
  )
  .output(
    z.object({
      deploys: z
        .array(
          z.object({
            deployId: z.number().describe('Unique deploy ID'),
            environment: z.string().optional().describe('Target environment'),
            revision: z.string().optional().describe('Code revision'),
            status: z.string().optional().describe('Deploy status'),
            localUsername: z.string().optional().describe('Local username of deployer'),
            rollbarUsername: z.string().optional().describe('Rollbar username of deployer'),
            comment: z.string().optional().describe('Deploy comment'),
            startTime: z.number().optional().describe('Unix timestamp of deploy start'),
            finishTime: z.number().optional().describe('Unix timestamp of deploy finish'),
            projectId: z.number().optional().describe('Associated project ID')
          })
        )
        .describe('List of deploys'),
      page: z.number().describe('Current page number'),
      nextPage: z
        .number()
        .optional()
        .describe(
          'Next source page to try when the provider returned a full page, even if environment filtering produced no matches'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listDeploys({
      environment: ctx.input.environment,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    const deploys = result.result.deploys.map(mapDeploy);

    return {
      output: {
        deploys,
        page: result.result.page ?? ctx.input.page ?? 1,
        nextPage:
          result.result.sourceCount === (ctx.input.limit ?? 20)
            ? (result.result.page ?? ctx.input.page ?? 1) + 1
            : undefined
      },
      message: `Found **${deploys.length}** deploys${ctx.input.environment ? ` in environment "${ctx.input.environment}"` : ''}.`
    };
  })
  .build();
