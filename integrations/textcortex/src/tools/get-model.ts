import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getModel = SlateTool.create(spec, {
  key: 'get_model',
  name: 'Get Model',
  description:
    'Retrieve a TextCortex model and its advertised deployment location. Call list_models to discover available IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ model: z.string().min(1).describe('Model ID returned by list_models') }))
  .output(
    z.object({
      id: z.string(),
      created: z.number(),
      ownedBy: z.string(),
      servedFromCountryCode: z.string().nullable(),
      deploymentJurisdiction: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    const model = await new Client({ token: ctx.auth.token }).getModel(ctx.input.model);
    return {
      output: {
        id: model.id,
        created: model.created,
        ownedBy: model.owned_by,
        servedFromCountryCode: model.served_from_country_code,
        deploymentJurisdiction: model.deployment_jurisdiction
      },
      message: `Retrieved TextCortex model ${model.id}.`
    };
  })
  .build();
