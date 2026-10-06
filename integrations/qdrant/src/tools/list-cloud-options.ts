import { SlateTool } from 'slates';
import { z } from 'zod';
import { resolveCloudClient } from '../lib/cloud-client';
import { accountIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listCloudOptions = SlateTool.create(spec, {
  name: 'List Cloud Cluster Options',
  key: 'list_cloud_options',
  description:
    'Discovers cloud providers, regions, and resource packages available to a Qdrant Cloud account. Call list_accounts to choose an account, then discover providers, regions, and packages before creating a cluster.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      action: z.enum(['providers', 'regions', 'packages']),
      accountId: accountIdSchema.optional(),
      cloudProvider: z
        .string()
        .optional()
        .describe(
          'Provider ID returned by the providers action. Required for regions and packages.'
        ),
      region: z
        .string()
        .optional()
        .describe(
          'Region ID returned by the regions action. Required for packages except hybrid cloud.'
        )
    })
  )
  .output(
    z.object({
      options: z.array(
        z.object({
          id: z.string().describe('Provider, region, or package ID'),
          name: z.string(),
          available: z.boolean().optional(),
          type: z.string().optional().describe('Package type, such as free or paid'),
          details: z
            .record(z.string(), z.unknown())
            .describe('Provider configuration and package resource or pricing details')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = await resolveCloudClient(
      ctx.auth,
      ctx.input.accountId,
      (ctx.config as { accountId?: string }).accountId
    );
    let result = await client.listCloudOptions(
      ctx.input.action,
      ctx.input.cloudProvider,
      ctx.input.region
    );
    let options = (result.items ?? []).map(item => ({
      id: item.id,
      name: item.name,
      available: item.available,
      type: item.type,
      details: item
    }));
    return {
      output: { options },
      message: `Found **${options.length}** cloud ${ctx.input.action}.`
    };
  })
  .build();
