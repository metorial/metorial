import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { accountInput, resourceOutput } from '../lib/contracts';
import { adPayload } from '../lib/mappers';
import { spec } from '../spec';

export let manageAd = SlateTool.create(spec, {
  name: 'Manage Ad',
  key: 'manage_ad',
  description:
    'Create or update a Standard ad. Creation requires an explicit status; ACTIVE may enable advertising spend. ARCHIVED/DELETED are retained states, not history erasure. Current API constraints and account ownership are checked before writing.',
  instructions: [
    'Supply an existing postId for creation. Creative text, media and call-to-action changes must be performed through the provider’s creative workflow, not this endpoint.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      accountId: accountInput,
      postId: z
        .string()
        .optional()
        .describe(
          'Existing creative post ID created in Ads Manager; required for creation. Direct headline/body/media fields are unsupported by the current Ad endpoint.'
        ),
      adId: z.string().optional().describe('Ad ID to update; omit to create a new ad'),
      adGroupId: z
        .string()
        .optional()
        .describe('Ad group ID for the new ad (required when creating)'),
      name: z.string().optional().describe('Ad name'),
      headline: z
        .string()
        .optional()
        .describe(
          'Unsupported direct creative field on the current Ad endpoint; supply an existing postId instead.'
        ),
      body: z
        .string()
        .optional()
        .describe(
          'Unsupported direct creative field on the current Ad endpoint; supply an existing postId instead.'
        ),
      clickUrl: z.string().optional().describe('Destination URL when ad is clicked'),
      callToAction: z
        .enum([
          'SHOP_NOW',
          'SIGN_UP',
          'DOWNLOAD',
          'INSTALL',
          'LEARN_MORE',
          'WATCH_NOW',
          'APPLY_NOW',
          'CONTACT_US',
          'GET_QUOTE',
          'SUBSCRIBE',
          'BOOK_NOW',
          'PLAY_NOW',
          'GET_STARTED'
        ])
        .optional()
        .describe(
          'Unsupported direct creative field on the current Ad endpoint; supply an existing postId instead.'
        ),
      thumbnailUrl: z
        .string()
        .optional()
        .describe(
          'Unsupported direct creative field on the current Ad endpoint; supply an existing postId instead.'
        ),
      videoUrl: z
        .string()
        .optional()
        .describe(
          'Unsupported direct creative field on the current Ad endpoint; supply an existing postId instead.'
        ),
      status: z
        .enum(['ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED'])
        .optional()
        .describe('Ad status')
    })
  )
  .output(
    z.object({
      adId: z.string().optional(),
      adGroupId: z.string().optional(),
      postId: z.string().optional(),
      name: z.string().optional(),
      headline: z.string().optional(),
      status: z.string().optional(),
      callToAction: z.string().optional(),
      raw: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const payload = await adPayload(client, ctx.input);
    const result = await client.write('ad', ctx.input.adId, payload);
    return {
      output: resourceOutput('ad', result),
      message:
        'Reddit acknowledged the resource write. Read it back to verify its configured and effective delivery states.'
    };
  })
  .build();
