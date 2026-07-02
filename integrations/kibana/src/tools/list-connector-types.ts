import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listConnectorTypes = SlateTool.create(spec, {
  name: 'List Connector Types',
  key: 'list_connector_types',
  description: `List Kibana connector types available for rules and cases, including license and feature availability. Use this before creating connectors to discover connectorTypeId values and supported features.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      featureId: z
        .string()
        .optional()
        .describe('Optional feature ID filter, such as "alerting" or "cases"')
    })
  )
  .output(
    z.object({
      connectorTypes: z
        .array(
          z.object({
            connectorTypeId: z.string().describe('Connector type ID, such as ".webhook"'),
            name: z.string().describe('Human-readable connector type name'),
            description: z.string().optional().describe('Connector type description'),
            enabled: z.boolean().optional().describe('Whether this connector type is enabled'),
            enabledInConfig: z
              .boolean()
              .optional()
              .describe('Whether this connector type is enabled in Kibana config'),
            enabledInLicense: z
              .boolean()
              .optional()
              .describe('Whether the current license enables this connector type'),
            minimumLicenseRequired: z
              .string()
              .optional()
              .describe('Minimum Elastic license required'),
            supportedFeatureIds: z
              .array(z.string())
              .optional()
              .describe('Kibana features supported by this connector type'),
            isDeprecated: z.boolean().optional().describe('Whether the type is deprecated'),
            isExperimental: z
              .boolean()
              .optional()
              .describe('Whether the type is experimental or technical preview'),
            isSystemActionType: z
              .boolean()
              .optional()
              .describe('Whether this is a system action connector type'),
            source: z.string().optional().describe('Source of the connector type definition')
          })
        )
        .describe('Connector types available in Kibana')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let connectorTypes = await client.getConnectorTypes(ctx.input.featureId);

    let mapped = connectorTypes.map((type: any) => ({
      connectorTypeId: type.id,
      name: type.name,
      description: type.description,
      enabled: type.enabled,
      enabledInConfig: type.enabled_in_config,
      enabledInLicense: type.enabled_in_license,
      minimumLicenseRequired: type.minimum_license_required,
      supportedFeatureIds: type.supported_feature_ids,
      isDeprecated: type.is_deprecated,
      isExperimental: type.is_experimental,
      isSystemActionType: type.is_system_action_type,
      source: type.source
    }));

    return {
      output: { connectorTypes: mapped },
      message: `Found **${mapped.length}** connector types.`
    };
  })
  .build();
