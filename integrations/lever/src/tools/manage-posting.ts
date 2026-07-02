import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let managePostingTool = SlateTool.create(spec, {
  name: 'Manage Posting',
  key: 'manage_posting',
  description: `Create a new job posting or update an existing one. Supports setting posting text, categories (team, department, location, commitment), state, distribution channels, salary ranges, and workplace type.`,
  instructions: [
    'To create a new posting, omit postingId.',
    'To update an existing posting, provide postingId.'
  ]
})
  .input(
    z.object({
      postingId: z
        .string()
        .optional()
        .describe('ID of posting to update. Omit to create new.'),
      text: z.string().optional().describe('Job title/posting text'),
      state: z
        .enum(['published', 'internal', 'closed', 'draft', 'pending'])
        .optional()
        .describe('Posting state'),
      distributionChannels: z
        .array(z.enum(['public', 'internal']))
        .optional()
        .describe('Distribution channels'),
      categories: z
        .object({
          team: z.string().optional().describe('Team name'),
          department: z.string().optional().describe('Department name'),
          location: z.string().optional().describe('Location name'),
          commitment: z.string().optional().describe('Commitment type (e.g., Full-time)')
        })
        .optional()
        .describe('Posting categories'),
      content: z
        .object({
          description: z.string().optional().describe('HTML job description'),
          descriptionPlain: z.string().optional().describe('Plain text job description'),
          lists: z
            .array(
              z.object({
                text: z.string().describe('List header'),
                content: z.string().describe('HTML list content')
              })
            )
            .optional()
            .describe('Additional content sections (requirements, etc.)'),
          closing: z.string().optional().describe('HTML closing content'),
          closingPlain: z.string().optional().describe('Plain text closing content')
        })
        .optional()
        .describe('Posting content'),
      salaryRange: z
        .object({
          min: z.number().optional(),
          max: z.number().optional(),
          currency: z.string().optional(),
          interval: z.enum(['per-year-salary', 'per-hour-wage', 'one-time']).optional()
        })
        .optional()
        .describe('Salary range information'),
      workplaceType: z
        .enum(['unspecified', 'on-site', 'remote', 'hybrid'])
        .optional()
        .describe('Workplace type'),
      ownerId: z.string().optional().describe('User ID of posting owner'),
      reqId: z.string().optional().describe('Requisition ID to associate')
    })
  )
  .output(
    z.object({
      postingId: z.string().describe('ID of the created or updated posting'),
      posting: z.any().describe('The full posting object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    let body: Record<string, any> = {};
    if (ctx.input.text) body.text = ctx.input.text;
    if (ctx.input.state) body.state = ctx.input.state;
    if (ctx.input.distributionChannels)
      body.distributionChannels = ctx.input.distributionChannels;
    if (ctx.input.categories) body.categories = ctx.input.categories;
    if (ctx.input.content) body.content = ctx.input.content;
    if (ctx.input.salaryRange) body.salaryRange = ctx.input.salaryRange;
    if (ctx.input.workplaceType) body.workplaceType = ctx.input.workplaceType;
    if (ctx.input.ownerId) body.owner = ctx.input.ownerId;
    if (ctx.input.reqId) body.reqId = ctx.input.reqId;

    let result: any;
    let isUpdate = !!ctx.input.postingId;

    if (isUpdate) {
      result = await client.updatePosting(ctx.input.postingId!, body);
    } else {
      result = await client.createPosting(body);
    }

    return {
      output: {
        postingId: result.data.id,
        posting: result.data
      },
      message: isUpdate
        ? `Updated posting **${result.data.id}**.`
        : `Created posting **${result.data.text || result.data.id}**.`
    };
  })
  .build();
