import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeutrinoClient } from '../lib/client';
import { uaLookupResponse } from '../lib/responses';
import { spec } from '../spec';

export const lookupUserAgentTool = SlateTool.create(spec, {
  key: 'lookup_user_agent',
  name: 'Look Up User Agent',
  description:
    'Identify browser, operating system, and device details from a user-agent string or client hints.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      ua: z
        .string()
        .describe(
          'User-agent string, sec-ch-ua header, or JSON from userAgentData.getHighEntropyValues()'
        ),
      uaVersion: z.string().optional().describe('sec-ch-ua-full-version client hint'),
      uaPlatform: z.string().optional().describe('sec-ch-ua-platform client hint'),
      uaPlatformVersion: z
        .string()
        .optional()
        .describe('sec-ch-ua-platform-version client hint'),
      uaMobile: z.string().optional().describe('sec-ch-ua-mobile client hint'),
      deviceModel: z
        .string()
        .optional()
        .describe('Device model name or sec-ch-ua-model client hint'),
      deviceBrand: z
        .string()
        .optional()
        .describe('Device manufacturer, used with deviceModel'),
      uaArch: z.string().optional().describe('sec-ch-ua-arch client hint'),
      uaBitness: z.string().optional().describe('sec-ch-ua-bitness client hint'),
      uaFormFactors: z.string().optional().describe('sec-ch-ua-form-factors client hint')
    })
  )
  .output(
    uaLookupResponse.extend({
      raw: z.record(z.string(), z.unknown()).describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeutrinoClient(ctx.auth);
    let input = ctx.input;
    let result = await client.structured(
      '/ua-lookup',
      {
        ua: input.ua,
        'ua-version': input.uaVersion,
        'ua-platform': input.uaPlatform,
        'ua-platform-version': input.uaPlatformVersion,
        'ua-mobile': input.uaMobile,
        'device-model': input.deviceModel,
        'device-brand': input.deviceBrand,
        'ua-arch': input.uaArch,
        'ua-bitness': input.uaBitness,
        'ua-form-factors': input.uaFormFactors
      },
      uaLookupResponse
    );
    return {
      output: result,
      message: `Identified **${result.name} ${result.version}** on ${result.os} (${result.type}).`
    };
  })
  .build();
