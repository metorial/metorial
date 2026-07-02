import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getInstanceInfo = SlateTool.create(spec, {
  name: 'Get Instance Info',
  key: 'get_instance_info',
  description: `Retrieve configuration and feature information about an Appsmith instance, including feature flags, license plan, and available authentication providers. This unauthenticated endpoint is useful for monitoring instance configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
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
        .describe('Additional instance configuration details.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token ?? ''
    });

    let data = await client.getInstanceInfo();

    let featureFlags = data?.featureFlags ?? data?.data?.featureFlags ?? {};
    let tenantConfig = data?.tenantConfiguration ?? data?.data?.tenantConfiguration ?? {};
    let licensePlan = tenantConfig?.license?.plan ?? tenantConfig?.licensePlan ?? undefined;
    let authProviders: string[] = [];

    if (tenantConfig?.thirdPartyAuth) {
      for (let [key, val] of Object.entries(tenantConfig.thirdPartyAuth)) {
        if (val) authProviders.push(key);
      }
    }

    return {
      output: {
        featureFlags,
        licensePlan,
        authProviders: authProviders.length > 0 ? authProviders : undefined,
        instanceConfig: tenantConfig
      },
      message: `Retrieved instance info.${licensePlan ? ` License plan: **${licensePlan}**.` : ''}`
    };
  })
  .build();
