import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { incomplete, type Row, record } from '../lib/validation';
import { spec } from '../spec';

export let getInstanceInfo = SlateTool.create(spec, {
  name: 'Get Instance Info',
  key: 'get_instance_info',
  description: `Retrieve configuration and feature information about an Appsmith instance, including feature flags, license plan, and available authentication providers. This unauthenticated endpoint is useful for monitoring instance configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      instanceUrl: z
        .string()
        .optional()
        .describe(
          'Instance origin for unauthenticated requests; must match a connected session when present.'
        )
    })
  )
  .output(
    z.object({
      featureFlags: z
        .record(z.string(), z.any())
        .optional()
        .describe('Feature flags enabled on the instance.'),
      licensePlan: z
        .string()
        .optional()
        .describe('The license plan of the instance (e.g. FREE, BUSINESS, ENTERPRISE).'),
      authProviders: z
        .array(z.string())
        .optional()
        .describe('Available authentication providers configured on the instance.'),
      instanceConfig: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Allowlisted public instance settings; credentials and arbitrary tenant configuration are omitted.'
        )
    })
  )
  .handleInvocation(async ctx => {
    const data = await clientFor(ctx, ctx.input.instanceUrl).getInstanceInfo();
    const tenant =
      data.tenantConfiguration == null ? undefined : record(data.tenantConfiguration);
    const featureFlags: Row | undefined =
      data.featureFlags == null
        ? undefined
        : Object.fromEntries(
            Object.entries(record(data.featureFlags)).filter(([, v]) => typeof v === 'boolean')
          );
    const plan = tenant?.license == null ? tenant?.licensePlan : record(tenant.license).plan;
    if (plan != null && typeof plan !== 'string') throw incomplete();
    const authProviders =
      tenant?.thirdPartyAuth == null
        ? undefined
        : Object.entries(record(tenant.thirdPartyAuth))
            .filter(
              ([, v]) =>
                v === true ||
                (typeof v === 'object' && v !== null && record(v).enabled === true)
            )
            .map(([key]) => key);
    const instanceConfig =
      tenant === undefined
        ? undefined
        : Object.fromEntries(
            ['instanceName', 'isSignupDisabled', 'isAnonymousAccessEnabled']
              .filter(key => ['string', 'boolean'].includes(typeof tenant[key]))
              .map(key => [key, tenant[key]])
          );
    return {
      output: {
        featureFlags,
        licensePlan: typeof plan === 'string' ? plan : undefined,
        authProviders,
        instanceConfig
      },
      message:
        'Retrieved the public configuration fields returned by this instance; unavailable fields are omitted.'
    };
  })
  .build();
