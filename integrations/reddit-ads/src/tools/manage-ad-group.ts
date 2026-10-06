import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { accountInput, resourceOutput } from '../lib/contracts';
import { adGroupPayload } from '../lib/mappers';
import { spec } from '../spec';

export let manageAdGroup = SlateTool.create(spec, {
  name: 'Manage Ad Group',
  key: 'manage_ad_group',
  description:
    'Create or update a Standard ad group. Creation requires an explicit status; ACTIVE may enable advertising spend. ARCHIVED/DELETED are retained states, not history erasure. Current API constraints and account ownership are checked before writing.',
  instructions: [
    'To create an ad group, omit adGroupId and provide campaignId. To update, provide adGroupId.',
    'Bid amount is in cents of the account currency. CPC/CPM/CPV specify bid type; optimizationStrategy controls optimization.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      accountId: accountInput,
      bidType: z
        .enum(['CPC', 'CPM', 'CPV', 'CPV6', 'CPV15'])
        .optional()
        .describe('Current bid type; must agree with legacy bidStrategy when both are given.'),
      optimizationStrategy: z
        .enum(['BIDLESS', 'MANUAL_BIDDING', 'MAXIMIZE_VOLUME', 'TARGET_CPX'])
        .nullable()
        .optional()
        .describe(
          'Required for non-CBO creation. Null or omission inherits the campaign strategy for CBO.'
        ),
      conversionPixelId: z
        .string()
        .optional()
        .describe('Pixel required for new ad groups; CBO groups inherit the parent Pixel.'),
      goalType: z
        .enum(['DAILY_SPEND', 'LIFETIME_SPEND'])
        .optional()
        .describe('Goal type for a new non-CBO ad group; CBO must match its parent.'),
      goalCents: z.number().optional().describe('Non-CBO ad-group budget in cents.'),
      optimizationGoal: z
        .string()
        .optional()
        .describe('Objective-specific optimization goal; immutable.'),
      adGroupId: z
        .string()
        .optional()
        .describe('Ad group ID to update; omit to create a new ad group'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID for the new ad group (required when creating)'),
      name: z.string().optional().describe('Ad group name'),
      bidCents: z.number().optional().describe('Bid amount in cents'),
      bidStrategy: z
        .enum(['CPC', 'CPM', 'CPA', 'CPV'])
        .optional()
        .describe(
          'Legacy bid type. CPC/CPM/CPV map to bid_type; CPA is unsupported. Use optimizationStrategy for bidding optimization.'
        ),
      status: z
        .enum(['ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED'])
        .optional()
        .describe('Ad group status'),
      startDate: z.string().optional().describe('Start date in ISO 8601 format'),
      endDate: z.string().optional().describe('End date in ISO 8601 format'),
      targetSubreddits: z
        .array(z.string())
        .optional()
        .describe('List of subreddit names to target'),
      targetInterests: z
        .array(z.string())
        .optional()
        .describe('List of interest category IDs to target'),
      targetKeywords: z.array(z.string()).optional().describe('List of keywords to target'),
      placements: z
        .array(z.enum(['FEED', 'CONVERSATIONS']))
        .optional()
        .describe('Ad placements')
    })
  )
  .output(
    z.object({
      adGroupId: z.string().optional(),
      campaignId: z.string().optional(),
      name: z.string().optional(),
      status: z.string().optional(),
      bidCents: z.number().optional(),
      bidStrategy: z.string().optional(),
      optimizationStrategy: z.string().optional(),
      raw: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const payload = await adGroupPayload(client, ctx.input);
    const result = await client.write('adGroup', ctx.input.adGroupId, payload);
    return {
      output: resourceOutput('adGroup', result),
      message:
        'Reddit acknowledged the resource write. Read it back to verify its configured and effective delivery states.'
    };
  })
  .build();
