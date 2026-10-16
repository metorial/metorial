import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLicensingModels = SlateTool.create(spec, {
  name: 'List Licensing Models',
  key: 'list_licensing_models',
  description:
    'Discover licensing models supported by NetLicensing before configuring a product module or license template.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ models: z.array(z.object({ name: z.string() })) }))
  .handleInvocation(async ctx => {
    let items = await new Client(ctx.auth.token).listLicensingModels();
    return {
      message: 'Supported licensing models retrieved.',
      output: { models: items.map(item => ({ name: item.name })) }
    };
  })
  .build();
