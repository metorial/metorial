import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let giftSchema = z.object({
  code: z.string().describe('Unique gift code (UUID)'),
  name: z.string().describe('Recipient name'),
  amount: z.number().describe('Gift amount in USD'),
  message: z.string().nullable().describe('Gift message'),
  ein: z.string().nullable().describe('Non-profit EIN if claimed'),
  status: z.string().describe('Gift status (new, accepted, denied, claimed)'),
  seen: z.boolean().describe('Whether the gift has been viewed'),
  claimed: z.boolean().describe('Whether the gift has been claimed'),
  url: z.string().describe('Shareable URL for the recipient to claim the gift'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let createGift = SlateTool.create(spec, {
  name: 'Create Gift',
  key: 'create_gift',
  description: `Create a Daffy Gift — a digital charity gift card that lets the recipient choose which nonprofit to donate to. Returns a shareable URL the recipient can use to claim their gift.`,
  constraints: ['Minimum gift amount is $18.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      recipientName: z.string().describe('Name of the gift recipient'),
      amount: z.number().min(18).describe('Gift amount in USD (minimum $18)')
    })
  )
  .output(giftSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let gift = await client.createGift({
      name: ctx.input.recipientName,
      amount: ctx.input.amount
    });

    return {
      output: {
        code: gift.code,
        name: gift.name,
        amount: gift.amount,
        message: gift.message,
        ein: gift.ein,
        status: gift.status,
        seen: gift.seen,
        claimed: gift.claimed,
        url: gift.url,
        createdAt: gift.created_at,
        updatedAt: gift.updated_at
      },
      message: `Created Daffy Gift of **$${gift.amount}** for **${gift.name}**. Share URL: ${gift.url}`
    };
  })
  .build();

export let listGifts = SlateTool.create(spec, {
  name: 'List Gifts',
  key: 'list_gifts',
  description: `Retrieve a paginated list of all Daffy Gifts you've created, including their current status (new, accepted, denied, claimed) and shareable URLs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z
        .number()
        .optional()
        .describe('Page number for pagination (defaults to first page)')
    })
  )
  .output(
    z.object({
      gifts: z.array(giftSchema).describe('List of gifts'),
      totalCount: z.number().describe('Total number of gifts'),
      currentPage: z.number().describe('Current page number'),
      lastPage: z.number().describe('Last available page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getGifts(ctx.input.page);

    return {
      output: {
        gifts: result.items.map(g => ({
          code: g.code,
          name: g.name,
          amount: g.amount,
          message: g.message,
          ein: g.ein,
          status: g.status,
          seen: g.seen,
          claimed: g.claimed,
          url: g.url,
          createdAt: g.created_at,
          updatedAt: g.updated_at
        })),
        totalCount: result.meta.count,
        currentPage: result.meta.page,
        lastPage: result.meta.last
      },
      message: `Found **${result.meta.count}** gift(s). Showing page ${result.meta.page} of ${result.meta.last}.`
    };
  })
  .build();

export let getGift = SlateTool.create(spec, {
  name: 'Get Gift',
  key: 'get_gift',
  description: `Retrieve details of a specific Daffy Gift by its unique code, including status, claim information, and the shareable URL.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      giftCode: z.string().describe('Unique gift code (UUID)')
    })
  )
  .output(giftSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let gift = await client.getGift(ctx.input.giftCode);

    return {
      output: {
        code: gift.code,
        name: gift.name,
        amount: gift.amount,
        message: gift.message,
        ein: gift.ein,
        status: gift.status,
        seen: gift.seen,
        claimed: gift.claimed,
        url: gift.url,
        createdAt: gift.created_at,
        updatedAt: gift.updated_at
      },
      message: `Gift **${gift.code}** for **${gift.name}** ($${gift.amount}): status **${gift.status}**, claimed: ${gift.claimed}.`
    };
  })
  .build();
