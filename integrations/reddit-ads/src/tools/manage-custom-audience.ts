import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedditAdsClient } from '../lib/client';
import { spec } from '../spec';

export let manageCustomAudience = SlateTool.create(spec, {
  name: 'Manage Custom Audience',
  key: 'manage_custom_audience',
  description: `Create a new custom audience or update an existing one. Custom audiences can be customer lists (email or MAID), website retargeting, lookalike, or engagement retargeting audiences. Use this to configure audience metadata; use the "Manage Audience Users" tool to add or remove users.`,
  instructions: [
    'To create, omit audienceId. To update, provide the audienceId.',
    'Audience types: CUSTOMER_LIST, WEBSITE, LOOKALIKE, ENGAGEMENT.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      audienceId: z
        .string()
        .optional()
        .describe('Audience ID to update; omit to create a new audience'),
      name: z.string().optional().describe('Audience name'),
      audienceType: z
        .enum(['CUSTOMER_LIST', 'WEBSITE', 'LOOKALIKE', 'ENGAGEMENT'])
        .optional()
        .describe('Type of custom audience'),
      description: z.string().optional().describe('Audience description')
    })
  )
  .output(
    z.object({
      audienceId: z.string().optional(),
      name: z.string().optional(),
      audienceType: z.string().optional(),
      approximateSize: z.number().optional(),
      status: z.string().optional(),
      raw: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedditAdsClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let payload: Record<string, any> = {};
    if (ctx.input.name !== undefined) payload.name = ctx.input.name;
    if (ctx.input.audienceType !== undefined) payload.type = ctx.input.audienceType;
    if (ctx.input.description !== undefined) payload.description = ctx.input.description;

    let result: any;
    let action: string;

    if (ctx.input.audienceId) {
      result = await client.updateCustomAudience(ctx.input.audienceId, payload);
      action = 'updated';
    } else {
      result = await client.createCustomAudience(payload);
      action = 'created';
    }

    return {
      output: {
        audienceId: result.id || result.audience_id,
        name: result.name,
        audienceType: result.type,
        approximateSize: result.approximate_size || result.size,
        status: result.status,
        raw: result
      },
      message: `Custom audience **${result.name || ctx.input.name}** ${action} successfully.`
    };
  })
  .build();
