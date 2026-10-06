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
import { mapSource, sourceId, sourceOutput } from '../lib/schemas';
import { validDomain } from '../lib/validation';
import { spec } from '../spec';
export const updateSource = SlateTool.create(spec, {
  name: 'Update Source',
  key: 'update_source',
  description:
    'Patch an existing source discovered by list_sources. Name/enabled are direct changes. Deployment, security, and cache changes replace the full deployment object and can redeploy the source; supply complete replacementDeployment to preserve write-only credentials. Disabling does not delete history or necessarily stop cached assets.',
  instructions: [
    'Lists and objects replace their entire prior value. Supply complete deployment configuration for any deployment/cache/security change; it cannot be reconstructed from GET because storage secrets are write-only.',
    'Azure deployment replacement currently requires the imgix dashboard; direct name/enabled changes remain available.',
    'Rendering changes become effective after deployment and may require a separately authorized purge.'
  ],
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      sourceId,
      name: z.string().min(1).optional(),
      enabled: z.boolean().optional(),
      ...sourceSettings,
      deployment: z
        .object({
          imgixSubdomains: z.array(z.string()).optional(),
          customDomains: z.array(z.string()).optional()
        })
        .optional(),
      replacementDeployment: deploymentInput
        .extend(sourceSettings)
        .optional()
        .describe(
          'Complete configuration for the existing source type, including credentials and settings to retain. Required for any deployment/cache/security change. Legacy deployment/settings fields explicitly override this supplied replacement.'
        )
    })
  )
  .output(sourceOutput)
  .handleInvocation(async ctx => {
    const input = ctx.input,
      changedSettings = settings(input),
      needsReplacement =
        Object.keys(changedSettings).length > 0 || input.deployment !== undefined;
    if (input.replacementDeployment?.type === 'azure')
      throw createApiServiceError(
        'Azure deployment replacement is unavailable because its SAS credential cannot be safely protected in request diagnostics. Change its deployment in the imgix dashboard; direct name/enabled changes remain available.',
        { parent: {} }
      );
    if (needsReplacement && !input.replacementDeployment)
      throw createApiServiceError(
        'Provide complete replacementDeployment for deployment/cache/security changes. GET cannot recover write-only credentials, and a partial object could erase settings.',
        { parent: {} }
      );
    const attributes: Record<string, unknown> = pickDefined({
      name: input.name,
      enabled: input.enabled
    });
    if (input.replacementDeployment) {
      const deployment = {
        ...buildDeployment(input.replacementDeployment),
        ...settings(input.replacementDeployment),
        ...changedSettings
      };
      if (input.deployment?.imgixSubdomains !== undefined) {
        const parsed = deploymentInput.shape.imgixSubdomains.safeParse(
          input.deployment.imgixSubdomains
        );
        if (
          !parsed.success ||
          parsed.data.some(value => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value))
        )
          throw createApiServiceError('Use at least one bare valid imgix subdomain label.', {
            parent: {}
          });
        deployment.imgix_subdomains = parsed.data;
      }
      if (input.deployment?.customDomains !== undefined) {
        input.deployment.customDomains.forEach(validDomain);
        deployment.custom_domains = input.deployment.customDomains;
      }
      if (deployment.type === 'webproxy' && deployment.secure_url_enabled === false)
        throw createApiServiceError('Web Proxy sources require secure URLs.', { parent: {} });
      attributes.deployment = deployment;
    }
    if (!Object.keys(attributes).length)
      throw createApiServiceError('Provide at least one supported source change.', {
        parent: {}
      });
    const client = new ImgixClient(
      ctx.auth.token,
      input.replacementDeployment
        ? deploymentCredentials(input.replacementDeployment, false)
        : []
    );
    if (input.replacementDeployment) {
      const current = (await client.getSource(input.sourceId)).data.attributes.deployment;
      if (!current?.type || current.type !== input.replacementDeployment.type)
        throw createApiServiceError(
          'replacementDeployment must describe the existing source type; this tool does not change storage types.',
          { parent: {} }
        );
      if (
        ['webfolder', 'webproxy'].includes(current.type) &&
        [
          current.password_set,
          current.request_handshake_set,
          current.request_signing_key_set
        ].some(value => typeof value !== 'boolean')
      )
        throw createApiServiceError(
          'Origin credential state is missing; a safe deployment replacement cannot be established. Change the source in the dashboard.',
          { parent: {} }
        );
      if (current.request_handshake_set || current.request_signing_key_set)
        throw createApiServiceError(
          'This source uses origin signing settings that this tool cannot safely preserve. Change its deployment in the dashboard.',
          { parent: {} }
        );
      if (current.password_set && input.replacementDeployment.webfolderPassword === undefined)
        throw createApiServiceError(
          'Supply the current origin credentials explicitly to preserve this source during replacement.',
          { parent: {} }
        );
    }
    const source = (await client.updateSource(input.sourceId, attributes)).data;
    return {
      output: mapSource(
        source,
        input.replacementDeployment ? deploymentCredentials(input.replacementDeployment) : []
      ),
      message: `Source ${source.id} returned enabled ${source.attributes.enabled} and deployment status ${source.attributes.deployment_status}. Configuration/history and cached assets may remain.`
    };
  })
  .build();
