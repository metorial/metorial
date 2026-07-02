import { SlateTool } from 'slates';
import { z } from 'zod';
import { CultsClient } from '../lib/client';
import { spec } from '../spec';

export let createDiscount = SlateTool.create(spec, {
  name: 'Create Discount',
  key: 'create_discount',
  description: `Schedule a promotional discount on one of your Cults3D creations. Set a discount percentage and end date.`,
  instructions: [
    'The discountEndAt date must be in ISO-8601 format (e.g. "2024-12-31T23:59:59Z")'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      creationId: z.string().describe('ID of the creation to discount'),
      discountPercentage: z.number().min(1).max(99).describe('Discount percentage (1-99)'),
      discountEndAt: z.string().describe('Discount end date in ISO-8601 format')
    })
  )
  .output(
    z.object({
      identifier: z.string().describe('Creation identifier'),
      name: z.string().nullable().describe('Creation name'),
      discountPercentage: z.number().nullable().describe('Applied discount percentage'),
      discountEndAt: z.string().nullable().describe('Discount end date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CultsClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let creation = await client.createDiscount({
      creationId: ctx.input.creationId,
      discountPercentage: ctx.input.discountPercentage,
      discountEndAt: ctx.input.discountEndAt
    });

    return {
      output: {
        identifier: creation.identifier,
        name: creation.name,
        discountPercentage: creation.discount?.percentage ?? null,
        discountEndAt: creation.discount?.endAt ?? null
      },
      message: `Applied **${ctx.input.discountPercentage}%** discount on **${creation.name ?? ctx.input.creationId}** until ${ctx.input.discountEndAt}.`
    };
  })
  .build();
