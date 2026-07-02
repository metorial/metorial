import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fundSchema = z.object({
  fundId: z.string().describe('Unique identifier of the fund'),
  code: z.string().nullable().describe('Fund code'),
  name: z.string().nullable().describe('Fund name'),
  raised: z.number().nullable().describe('Amount raised'),
  supporters: z.number().nullable().describe('Number of supporters'),
  createdAt: z.string().nullable().describe('When created'),
  updatedAt: z.string().nullable().describe('When updated')
});

export let listFunds = SlateTool.create(spec, {
  name: 'List Funds',
  key: 'list_funds',
  description: `Retrieve a paginated list of funds used to categorize and designate donations for specific purposes or programs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      funds: z.array(fundSchema).describe('List of funds'),
      totalCount: z.number().describe('Total number of funds'),
      currentPage: z.number().describe('Current page'),
      lastPage: z.number().describe('Last page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listFunds({ page: ctx.input.page });

    let funds = result.data.map((f: any) => ({
      fundId: String(f.id),
      code: f.code ?? null,
      name: f.name ?? null,
      raised: f.raised ?? null,
      supporters: f.supporters ?? null,
      createdAt: f.created_at ?? null,
      updatedAt: f.updated_at ?? null
    }));

    return {
      output: {
        funds,
        totalCount: result.meta.total,
        currentPage: result.meta.current_page,
        lastPage: result.meta.last_page
      },
      message: `Found **${result.meta.total}** funds (page ${result.meta.current_page} of ${result.meta.last_page}).`
    };
  })
  .build();

export let createFund = SlateTool.create(spec, {
  name: 'Create Fund',
  key: 'create_fund',
  description: `Create a new fund to categorize donations for a specific purpose or program.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the fund'),
      code: z.string().optional().describe('Optional fund code')
    })
  )
  .output(fundSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let f = await client.createFund({
      name: ctx.input.name,
      code: ctx.input.code
    });

    return {
      output: {
        fundId: String(f.id),
        code: f.code ?? null,
        name: f.name ?? null,
        raised: f.raised ?? null,
        supporters: f.supporters ?? null,
        createdAt: f.created_at ?? null,
        updatedAt: f.updated_at ?? null
      },
      message: `Created fund **${f.name ?? f.id}**.`
    };
  })
  .build();

export let updateFund = SlateTool.create(spec, {
  name: 'Update Fund',
  key: 'update_fund',
  description: `Update an existing fund's name or code.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      fundId: z.string().describe('ID of the fund to update'),
      name: z.string().optional().describe('New fund name'),
      code: z.string().optional().describe('New fund code')
    })
  )
  .output(fundSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let updateData: Record<string, any> = {};
    if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
    if (ctx.input.code !== undefined) updateData.code = ctx.input.code;

    let f = await client.updateFund(ctx.input.fundId, updateData);

    return {
      output: {
        fundId: String(f.id),
        code: f.code ?? null,
        name: f.name ?? null,
        raised: f.raised ?? null,
        supporters: f.supporters ?? null,
        createdAt: f.created_at ?? null,
        updatedAt: f.updated_at ?? null
      },
      message: `Updated fund **${f.name ?? f.id}**.`
    };
  })
  .build();

export let deleteFund = SlateTool.create(spec, {
  name: 'Delete Fund',
  key: 'delete_fund',
  description: `Permanently delete a fund. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      fundId: z.string().describe('ID of the fund to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the fund was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteFund(ctx.input.fundId);

    return {
      output: { deleted: true },
      message: `Deleted fund **${ctx.input.fundId}**.`
    };
  })
  .build();
