import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updatePolicy = SlateTool.create(spec, {
  name: 'Update Policy',
  key: 'update_policy',
  description: `Enable, disable, or configure an organization policy. Policies enforce behaviors like requiring two-step login, setting master password requirements, and restricting vault exports. Available for Enterprise organizations.`,
  instructions: [
    'The configuration data varies by policy type. For example, MasterPassword (type 1) may accept { "minComplexity": 3, "minLength": 12 }.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      policyId: z.string().describe('ID of the policy to update'),
      enabled: z.boolean().describe('Whether to enable or disable the policy'),
      configuration: z
        .record(z.string(), z.any())
        .optional()
        .describe('Policy-specific configuration data')
    })
  )
  .output(
    z.object({
      policyId: z.string().describe('ID of the updated policy'),
      policyType: z.number().describe('Type of the policy'),
      enabled: z.boolean().describe('Updated enabled state'),
      configuration: z.record(z.string(), z.any()).nullable().describe('Updated configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let result = await client.updatePolicy(ctx.input.policyId, {
      enabled: ctx.input.enabled,
      data: ctx.input.configuration
    });

    return {
      output: {
        policyId: result.id,
        policyType: result.type,
        enabled: result.enabled,
        configuration: result.data
      },
      message: `Policy **${result.id}** has been **${result.enabled ? 'enabled' : 'disabled'}**.`
    };
  })
  .build();
