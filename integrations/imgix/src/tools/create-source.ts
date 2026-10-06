import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { ImgixClient } from '../lib/client';
import {
  buildDeployment,
  deploymentCredentials,
  deploymentInput,
  settings,
  sourceSettings
} from '../lib/deployment';
import { mapSource, sourceOutput } from '../lib/schemas';
import { spec } from '../spec';
export const createSource = SlateTool.create(spec, {
  name: 'Create Source',
  key: 'create_source',
  description:
    'Create a source and request deployment with an explicit supported storage configuration. Azure source creation currently requires the imgix dashboard. Deployment can remain pending. The source configuration/history is retained; disabling it later does not erase cached assets or history.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      name: z.string().min(1),
      deployment: deploymentInput,
      enabled: z.boolean().optional(),
      ...sourceSettings
    })
  )
  .output(sourceOutput)
  .handleInvocation(async ctx => {
    if (ctx.input.deployment.type === 'azure')
      throw createApiServiceError(
        'Azure deployment creation is unavailable because its SAS credential cannot be safely protected in request diagnostics. Create the Azure source in the imgix dashboard; existing-source reads and direct name/enabled changes remain available.',
        { parent: {} }
      );
    const deployment = { ...buildDeployment(ctx.input.deployment), ...settings(ctx.input) };
    if (deployment.type === 'webproxy' && deployment.secure_url_enabled === false)
      throw createApiServiceError('Web Proxy sources require secure URLs.', { parent: {} });
    const source = (
      await new ImgixClient(
        ctx.auth.token,
        deploymentCredentials(ctx.input.deployment, false)
      ).createSource(
        pickDefined({ name: ctx.input.name, enabled: ctx.input.enabled, deployment })
      )
    ).data;
    return {
      output: mapSource(source, deploymentCredentials(ctx.input.deployment)),
      message: `Source ${source.id} was created with deployment status ${source.attributes.deployment_status}. Read get_source to confirm readiness.`
    };
  })
  .build();
