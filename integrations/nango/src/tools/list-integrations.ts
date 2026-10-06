import { SlateTool } from 'slates';
import { clientFor } from '../lib/client';
import { integrationOutput, integrationView, z } from '../lib/schemas';
import { spec } from '../spec';
export const listIntegrations = SlateTool.create(spec, {
  name: 'List Integrations',
  key: 'list_integrations',
  description:
    'List configured integrations in the connected Nango environment with exact IDs and provider names. Credentials are not delivered. This native collection has no documented pagination; responses above the local 2,000-entry safety limit are refused.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ integrations: z.array(integrationOutput) }))
  .handleInvocation(async ctx => {
    const result = await clientFor(ctx).listIntegrations();
    return {
      output: { integrations: result.data.map(integrationView) },
      message: 'Retrieved integration metadata.'
    };
  })
  .build();
