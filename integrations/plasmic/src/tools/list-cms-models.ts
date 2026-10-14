import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { CmsClient } from '../lib/cms-client';
import { spec } from '../spec';

export let listCmsModels = SlateTool.create(spec, {
  name: 'List CMS Models',
  key: 'list_cms_models',
  description:
    'List models and their field definitions in the connected Plasmic CMS database. Use each model identifier as modelId in CMS content tools.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      models: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'CMS model definitions, including identifiers, names, internal IDs, and field schemas'
        )
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.cmsId || !(ctx.auth.cmsPublicToken || ctx.auth.cmsSecretToken)) {
      throw createApiServiceError('CMS ID and a CMS token are required to list models');
    }
    let client = new CmsClient({
      cmsId: ctx.auth.cmsId,
      publicToken: ctx.auth.cmsPublicToken,
      secretToken: ctx.auth.cmsSecretToken
    });
    let result = await client.listModels();
    return {
      output: { models: result.tables },
      message: `Retrieved ${result.tables.length} CMS model(s).`
    };
  })
  .build();
