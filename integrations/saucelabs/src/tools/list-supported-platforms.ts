import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let platformSchema = z.object({
  shortVersion: z.string().optional().describe('Short browser/platform version'),
  longName: z.string().optional().describe('Full display name (e.g., "Google Chrome 119")'),
  apiName: z.string().optional().describe('API name for the browser/device'),
  os: z.string().optional().describe('Operating system'),
  automationBackend: z.string().optional().describe('Automation backend (webdriver, appium)'),
  device: z.string().optional().describe('Device name (for mobile platforms)'),
  longVersion: z.string().optional().describe('Full version string'),
  recommendedBackendVersion: z
    .string()
    .optional()
    .describe('Recommended automation backend version')
});

export let listSupportedPlatforms = SlateTool.create(spec, {
  name: 'List Supported Platforms',
  key: 'list_supported_platforms',
  description: `Retrieve the list of supported browser, OS, and device combinations available on Sauce Labs. Filter by automation framework to see only WebDriver or Appium platforms.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      automationApi: z
        .enum(['all', 'webdriver', 'appium'])
        .default('all')
        .describe('Filter by automation framework')
    })
  )
  .output(
    z.object({
      platforms: z.array(platformSchema).describe('Supported platform combinations'),
      totalCount: z.number().describe('Total number of platforms')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getSupportedPlatforms(ctx.input.automationApi);

    let platforms = (Array.isArray(result) ? result : []).map((p: any) => ({
      shortVersion: p.short_version,
      longName: p.long_name,
      apiName: p.api_name,
      os: p.os,
      automationBackend: p.automation_backend,
      device: p.device || undefined,
      longVersion: p.long_version,
      recommendedBackendVersion: p.recommended_backend_version
    }));

    return {
      output: { platforms, totalCount: platforms.length },
      message: `Found **${platforms.length}** supported platform combinations for **${ctx.input.automationApi}**.`
    };
  })
  .build();
