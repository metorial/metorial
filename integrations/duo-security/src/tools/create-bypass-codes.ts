import { SlateTool } from 'slates';
import { z } from 'zod';
import { DuoClient } from '../lib/client';
import { spec } from '../spec';

export let createBypassCodes = SlateTool.create(spec, {
  name: 'Create Bypass Codes',
  key: 'create_bypass_codes',
  description: `Generate one-time bypass codes for a Duo user. Bypass codes allow users to authenticate when they don't have access to their normal MFA device.`,
  instructions: ['Bypass codes are single-use and should be shared securely with the user.']
})
  .input(
    z.object({
      userId: z.string().describe('The Duo user ID to generate bypass codes for'),
      count: z
        .number()
        .optional()
        .describe('Number of bypass codes to generate (default: 1, max: 10)'),
      validSecs: z
        .number()
        .optional()
        .describe('Validity period in seconds (0 for no expiration)')
    })
  )
  .output(
    z.object({
      codes: z.array(z.string())
    })
  )
  .handleInvocation(async ctx => {
    let client = new DuoClient({
      integrationKey: ctx.auth.integrationKey,
      secretKey: ctx.auth.secretKey,
      apiHostname: ctx.auth.apiHostname
    });

    let result = await client.createBypassCodes(ctx.input.userId, {
      count: ctx.input.count,
      validSecs: ctx.input.validSecs
    });

    return {
      output: { codes: result.response },
      message: `Generated **${result.response.length}** bypass code(s) for user \`${ctx.input.userId}\`.`
    };
  })
  .build();
