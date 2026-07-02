import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { RemoteConfigClient } from '../lib/client';
import { firebaseServiceError, missingRequiredFieldError } from '../lib/errors';
import { firebaseActionScopes } from '../scopes';
import { spec } from '../spec';

export let updateRemoteConfig = SlateTool.create(spec, {
  name: 'Update Remote Config',
  key: 'update_remote_config',
  description: `Publish an updated Firebase Remote Config template or roll back to a previous version. When publishing, provide the full template with parameters, conditions, and the current ETag. Use the "Get Remote Config" tool first to retrieve the current ETag.`,
  instructions: [
    'Always fetch the current template and ETag before publishing.',
    'The ETag ensures you do not overwrite concurrent changes (optimistic concurrency).',
    'For rollback, provide the version number to restore.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(firebaseActionScopes.updateRemoteConfig)
  .input(
    z.object({
      operation: z
        .enum(['publish', 'rollback'])
        .describe('Whether to publish a new template or roll back to a previous version'),
      etag: z
        .string()
        .optional()
        .describe('Current ETag from the template (required for publish)'),
      parameters: z
        .record(
          z.string(),
          z.object({
            defaultValue: z
              .union([
                z.object({ value: z.string() }),
                z.object({ useInAppDefault: z.boolean() })
              ])
              .optional()
              .describe('Default value for the parameter'),
            conditionalValues: z
              .record(z.string(), z.object({ value: z.string() }))
              .optional()
              .describe('Values conditioned on conditions'),
            description: z.string().optional().describe('Parameter description'),
            valueType: z
              .enum(['STRING', 'NUMBER', 'BOOLEAN', 'JSON'])
              .optional()
              .describe('Expected value type')
          })
        )
        .optional()
        .describe('Parameters to publish (required for publish)'),
      conditions: z
        .array(
          z.object({
            name: z.string().describe('Condition name'),
            expression: z.string().describe('Condition expression'),
            tagColor: z.string().optional().describe('Tag color for the condition')
          })
        )
        .optional()
        .describe('Conditions to publish'),
      parameterGroups: z
        .record(
          z.string(),
          z.object({
            description: z.string().optional(),
            parameters: z.record(z.string(), z.any())
          })
        )
        .optional()
        .describe('Parameter groups to publish'),
      rollbackVersionNumber: z
        .string()
        .optional()
        .describe('Version number to roll back to (required for rollback)')
    })
  )
  .output(
    z.object({
      parameters: z.record(z.string(), z.any()).describe('Updated parameters'),
      conditions: z.array(z.any()).describe('Updated conditions'),
      parameterGroups: z.record(z.string(), z.any()).describe('Updated parameter groups'),
      etag: z.string().describe('New ETag after the update'),
      version: z.any().optional().describe('Updated version metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RemoteConfigClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let { operation } = ctx.input;

    if (operation === 'publish') {
      if (!ctx.input.etag) throw missingRequiredFieldError('etag', 'publish');
      if (!ctx.input.parameters) throw missingRequiredFieldError('parameters', 'publish');

      let template = await client.publishTemplate(
        {
          parameters: ctx.input.parameters,
          conditions: ctx.input.conditions,
          parameterGroups: ctx.input.parameterGroups
        },
        ctx.input.etag
      );

      return {
        output: {
          parameters: template.parameters || {},
          conditions: template.conditions || [],
          parameterGroups: template.parameterGroups || {},
          etag: template.etag,
          version: template.version
        },
        message: `Published Remote Config template with **${Object.keys(template.parameters || {}).length}** parameter(s).`
      };
    }

    if (operation === 'rollback') {
      if (!ctx.input.rollbackVersionNumber)
        throw missingRequiredFieldError('rollbackVersionNumber', 'rollback');

      let template = await client.rollback(ctx.input.rollbackVersionNumber);

      return {
        output: {
          parameters: template.parameters || {},
          conditions: template.conditions || [],
          parameterGroups: template.parameterGroups || {},
          etag: template.etag,
          version: template.version
        },
        message: `Rolled back Remote Config to version **${ctx.input.rollbackVersionNumber}**.`
      };
    }

    throw firebaseServiceError(`Unknown operation: ${operation}`);
  })
  .build();
