import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getPolicy = SlateTool.create(spec, {
  key: 'get_policy',
  name: 'Get Policy',
  description:
    'Read one organization policy by its native policyType from list_policies. The provider route uses a numeric policy type, not a policy UUID.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      policyType: z.number().describe('Native numeric policyType from list_policies.')
    })
  )
  .output(
    z.object({
      policyId: z.string(),
      policyType: z.number(),
      enabled: z.boolean(),
      configurationAvailable: z
        .boolean()
        .optional()
        .describe(
          'Whether the provider exposed the configuration field; false means its current value is unknown.'
        ),
      configuration: z.record(z.string(), z.unknown()).nullable()
    })
  )
  .handleInvocation(async ctx => {
    const value = await new Client({ ...ctx.auth }).getPolicy(ctx.input.policyType);
    return {
      output: {
        policyId: value.id,
        policyType: value.type,
        enabled: value.enabled,
        configurationAvailable: value.data !== undefined,
        configuration: value.data ?? null
      },
      message:
        value.data === undefined
          ? 'Retrieved policy metadata; configuration is not exposed.'
          : 'Retrieved the exact policy configuration.'
    };
  })
  .build();
