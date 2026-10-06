import { SlateTool } from 'slates';
import { clientFor } from '../lib/client';
import {
  integrationId,
  integrationOutput,
  integrationView,
  invalid,
  jsonObject,
  text,
  z
} from '../lib/schemas';
import { spec } from '../spec';
export const manageIntegration = SlateTool.create(spec, {
  name: 'Manage Integration',
  key: 'manage_integration',
  description:
    'Create, update, retrieve or delete one exact integration. Call list_integrations and list_providers for authorized IDs and provider names. Outputs contain metadata only. Deletion can affect connected users, deployed functions and retained provider history; it does not promise upstream credential revocation or erasure.',
  instructions: [
    'Use native snake_case keys such as client_id and client_secret in credentials. Never request sensitive includes.',
    'Update only changes supplied fields. After a timeout read the exact integration before retrying a write.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'get', 'delete']),
      uniqueKey: integrationId,
      provider: text
        .optional()
        .describe('Native provider name from list_providers; required for create.'),
      displayName: text.optional(),
      credentials: jsonObject
        .optional()
        .describe(
          'Provider-specific native credential object for create/update only. Credentials are never returned.'
        ),
      include: z
        .array(text)
        .optional()
        .describe(
          'Legacy sensitive includes. Nonempty values are refused; omit to retrieve metadata.'
        )
    })
  )
  .output(z.object({ success: z.boolean(), integration: integrationOutput.optional() }))
  .handleInvocation(async ctx => {
    const { action, uniqueKey, provider, displayName, credentials, include } = ctx.input;
    if (include?.length)
      throw invalid(
        'Sensitive integration includes are unavailable. Omit include to read metadata; use a trusted Nango backend for secrets.'
      );
    if (
      (action === 'get' || action === 'delete') &&
      (provider !== undefined || displayName !== undefined || credentials !== undefined)
    )
      throw invalid('Create/update fields cannot be supplied for get/delete.');
    if (action === 'create' && !provider)
      throw invalid(
        'provider is required for create. Discover the exact name with list_providers.'
      );
    if (
      action === 'update' &&
      (provider !== undefined || (displayName === undefined && credentials === undefined))
    )
      throw invalid(
        'Update requires displayName or credentials; changing provider is not supported.'
      );
    const client = clientFor(ctx);
    if (action === 'delete') {
      const result = await client.deleteIntegration(uniqueKey);
      return {
        output: result,
        message: result.success
          ? 'Nango accepted integration deletion. Verify absence separately; provider history may remain.'
          : 'Nango did not confirm deletion.'
      };
    }
    const result =
      action === 'get'
        ? await client.getIntegration(uniqueKey)
        : action === 'create'
          ? await client.createIntegration({
              unique_key: uniqueKey,
              provider: provider!,
              display_name: displayName,
              credentials
            })
          : await client.updateIntegration(uniqueKey, {
              display_name: displayName,
              credentials
            });
    return {
      output: { success: true, integration: integrationView(result.data) },
      message:
        action === 'get'
          ? 'Retrieved integration metadata.'
          : 'Nango returned the exact integration receipt. Existing provider effects may remain.'
    };
  })
  .build();
