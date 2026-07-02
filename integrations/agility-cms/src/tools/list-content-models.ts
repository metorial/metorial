import { SlateTool } from 'slates';
import { z } from 'zod';
import { MgmtClient } from '../lib/client';
import { spec } from '../spec';

export let listContentModels = SlateTool.create(spec, {
  name: 'List Content Models',
  key: 'list_content_models',
  description: `Lists all content models or page modules defined in the Agility CMS instance. Content models define the schema for content items; page modules define reusable page components. Requires OAuth authentication.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modelType: z
        .enum(['content', 'page_modules'])
        .default('content')
        .describe(
          'Type of models to list: "content" for content models, "page_modules" for page module definitions'
        ),
      includeDefaults: z
        .boolean()
        .default(false)
        .describe('Whether to include default system models')
    })
  )
  .output(
    z.object({
      models: z.array(z.record(z.string(), z.any())).describe('Array of model definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MgmtClient({
      token: ctx.auth.token,
      guid: ctx.config.guid,
      locale: ctx.config.locale,
      region: ctx.auth.region
    });

    let models =
      ctx.input.modelType === 'page_modules'
        ? await client.listPageModules(ctx.input.includeDefaults)
        : await client.listContentModels(ctx.input.includeDefaults);

    let modelList = Array.isArray(models) ? models : [];

    return {
      output: { models: modelList },
      message: `Retrieved **${modelList.length}** ${ctx.input.modelType === 'page_modules' ? 'page module' : 'content model'}(s)`
    };
  })
  .build();
