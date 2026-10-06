import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let listEnvironments = SlateTool.create(spec, {
  name: 'List Environments',
  key: 'list_environments',
  description: `List all environments (e.g., staging, production) configured in the Retool organization.`,
  constraints: [
    'Requires the relevant read or write API token scope and support in this deployment.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      environments: z.array(
        z.object({
          environmentId: z.string(),
          environmentName: z.string(),
          isDefault: z.boolean().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let result = await client.listEnvironments();

    let environments = result.data.map(e => ({
      environmentId: e.id,
      environmentName: e.name,
      isDefault: e.default,
      createdAt: e.created_at,
      updatedAt: e.updated_at
    }));

    return {
      output: {
        environments,
        totalCount: result.total_count
      },
      message: `Found **${result.total_count}** environments.`
    };
  })
  .build();
