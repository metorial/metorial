import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pinterestServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageAudience = SlateTool.create(spec, {
  name: 'Manage Audience',
  key: 'manage_audience',
  description: `Create or list custom audiences for ad targeting. Audiences can be based on customer lists, engagement, website visitors, or act-alike audiences.`,
  instructions: [
    'Set "action" to "list" to view existing audiences for an ad account.',
    'Set "action" to "create" to create a new custom audience with targeting rules.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create']).describe('Action to perform'),
      adAccountId: z.string().describe('ID of the ad account'),
      name: z.string().optional().describe('Audience name (required for create)'),
      description: z.string().optional().describe('Audience description (for create)'),
      audienceType: z
        .enum(['CUSTOMER_LIST', 'VISITOR', 'ENGAGEMENT', 'ACTALIKE'])
        .optional()
        .describe('Type of audience (required for create)'),
      rule: z
        .record(z.string(), z.any())
        .optional()
        .describe('Targeting rule configuration (required for create)'),
      bookmark: z.string().optional().describe('Pagination bookmark (for list)'),
      pageSize: z.number().optional().describe('Number of audiences per page (for list)')
    })
  )
  .output(
    z.object({
      audiences: z.array(z.any()).optional().describe('List of audiences (for list action)'),
      audience: z.any().optional().describe('Created audience details (for create action)'),
      bookmark: z.string().optional().describe('Pagination bookmark')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listAudiences(ctx.input.adAccountId, {
        bookmark: ctx.input.bookmark,
        pageSize: ctx.input.pageSize
      });

      let audiences = result.items || [];

      return {
        output: {
          audiences,
          bookmark: result.bookmark ?? undefined
        },
        message: `Found **${audiences.length}** audience(s).${result.bookmark ? ' More results available with bookmark.' : ''}`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name || !ctx.input.audienceType || !ctx.input.rule) {
        throw pinterestServiceError(
          'Name, audienceType, and rule are required for create action'
        );
      }

      let result = await client.createAudience(ctx.input.adAccountId, {
        name: ctx.input.name,
        description: ctx.input.description,
        audienceType: ctx.input.audienceType,
        rule: ctx.input.rule
      });

      return {
        output: {
          audience: result
        },
        message: `Created audience **${ctx.input.name}**.`
      };
    }

    throw pinterestServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
