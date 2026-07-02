import { SlateTool } from 'slates';
import { z } from 'zod';
import { AblyRestClient } from '../lib/client';
import { spec } from '../spec';

export let revokeTokens = SlateTool.create(spec, {
  name: 'Revoke Tokens',
  key: 'revoke_tokens',
  description: `Revoke previously issued Ably tokens matching specified targets. Targets can be client IDs or other token identifiers. All matching tokens issued before the specified time will be revoked.`,
  instructions: [
    'Requires API Key authentication (Basic auth only, not token auth).',
    'The keyName is the part of the API key before the colon (e.g. "I2E_JQ.OqUdfg").',
    'Target specifiers identify which tokens to revoke (e.g. "clientId:myClient").'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      keyName: z.string().describe('The key name portion of the API key (appId.keyId format)'),
      targets: z
        .array(z.string())
        .describe(
          'Array of target specifier strings identifying tokens to revoke (e.g. "clientId:myClient")'
        ),
      issuedBefore: z
        .number()
        .optional()
        .describe(
          'Revoke tokens issued before this Unix timestamp in milliseconds. Defaults to current time.'
        ),
      allowReauthMargin: z
        .boolean()
        .optional()
        .describe(
          'If true, adds a margin before revocation takes effect to allow clients to re-authenticate (default: false)'
        )
    })
  )
  .output(
    z.object({
      revocations: z
        .array(
          z.object({
            target: z.string().optional(),
            issuedBefore: z.number().optional(),
            appliesAt: z.number().optional()
          })
        )
        .describe('Details of the revocation records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AblyRestClient(ctx.auth.token);

    let result = await client.revokeTokens(ctx.input.keyName, {
      targets: ctx.input.targets,
      issuedBefore: ctx.input.issuedBefore,
      allowReauthMargin: ctx.input.allowReauthMargin
    });

    let revocations = Array.isArray(result) ? result : [result];

    return {
      output: { revocations },
      message: `Revoked tokens matching **${ctx.input.targets.length}** target(s) for key **${ctx.input.keyName}**.`
    };
  })
  .build();
