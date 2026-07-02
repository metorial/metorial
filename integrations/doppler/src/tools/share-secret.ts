import { SlateTool } from 'slates';
import { z } from 'zod';
import { DopplerClient } from '../lib/client';
import { spec } from '../spec';

export let shareSecret = SlateTool.create(spec, {
  name: 'Share Secret',
  key: 'share_secret',
  description: `Generate a temporary, shareable Doppler Share link for a secret value. The secret is sent in plain text to Doppler but is never stored — a one-time-use or limited-view URL is returned for secure sharing.`,
  instructions: [
    'Provide the secret value to share.',
    'Optionally set expireViews (1-50, or -1 for unlimited) and expireDays (1-90).'
  ],
  constraints: [
    'The secret is sent in plain text to the Doppler API (not end-to-end encrypted).',
    'Maximum 50 views and 90 days expiration.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      secret: z.string().describe('The secret value to share'),
      expireViews: z
        .number()
        .optional()
        .describe('Number of views before the link expires (1-50, or -1 for unlimited)'),
      expireDays: z
        .number()
        .optional()
        .describe('Number of days before the link expires (1-90)')
    })
  )
  .output(
    z.object({
      url: z.string().describe('Shareable URL for the secret'),
      expiresAt: z.string().optional().describe('Expiration timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DopplerClient({ token: ctx.auth.token });

    let result = await client.shareSecretPlainText(ctx.input.secret, {
      expireViews: ctx.input.expireViews,
      expireDays: ctx.input.expireDays
    });

    return {
      output: {
        url: result.url || result.authenticated_url || '',
        expiresAt: result.expires_at
      },
      message: `Created shareable secret link: ${result.url || result.authenticated_url || 'unknown'}`
    };
  })
  .build();
