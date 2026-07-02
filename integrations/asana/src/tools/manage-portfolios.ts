import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPortfolios = SlateTool.create(spec, {
  name: 'List Portfolios',
  key: 'list_portfolios',
  description: `List portfolios in a workspace owned by a specific user. Portfolios are collections of projects used for tracking at a higher level.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('Workspace GID'),
      ownerId: z.string().describe('Owner user GID or "me"'),
      limit: z.number().optional().describe('Maximum number of portfolios to return')
    })
  )
  .output(
    z.object({
      portfolios: z.array(
        z.object({
          portfolioId: z.string(),
          name: z.string(),
          color: z.string().nullable().optional(),
          createdAt: z.string().optional(),
          dueOn: z.string().nullable().optional(),
          startOn: z.string().nullable().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listPortfolios(ctx.input.workspaceId, ctx.input.ownerId, {
      limit: ctx.input.limit
    });
    let portfolios = (result.data || []).map((p: any) => ({
      portfolioId: p.gid,
      name: p.name,
      color: p.color,
      createdAt: p.created_at,
      dueOn: p.due_on,
      startOn: p.start_on
    }));

    return {
      output: { portfolios },
      message: `Found **${portfolios.length}** portfolio(s).`
    };
  })
  .build();

export let getPortfolio = SlateTool.create(spec, {
  name: 'Get Portfolio',
  key: 'get_portfolio',
  description: `Get full details for a portfolio including its items, members, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      portfolioId: z.string().describe('Portfolio GID')
    })
  )
  .output(
    z.object({
      portfolioId: z.string(),
      name: z.string(),
      color: z.string().nullable().optional(),
      createdAt: z.string().optional(),
      dueOn: z.string().nullable().optional(),
      startOn: z.string().nullable().optional(),
      owner: z.any().optional(),
      members: z.array(z.any()).optional(),
      customFields: z.array(z.any()).optional(),
      items: z
        .array(
          z.object({
            itemId: z.string(),
            name: z.string(),
            resourceType: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let [portfolio, itemsResult] = await Promise.all([
      client.getPortfolio(ctx.input.portfolioId),
      client.listPortfolioItems(ctx.input.portfolioId)
    ]);

    let items = (itemsResult.data || []).map((i: any) => ({
      itemId: i.gid,
      name: i.name,
      resourceType: i.resource_type
    }));

    return {
      output: {
        portfolioId: portfolio.gid,
        name: portfolio.name,
        color: portfolio.color,
        createdAt: portfolio.created_at,
        dueOn: portfolio.due_on,
        startOn: portfolio.start_on,
        owner: portfolio.owner,
        members: portfolio.members,
        customFields: portfolio.custom_fields,
        items
      },
      message: `Retrieved portfolio **${portfolio.name}** with **${items.length}** item(s).`
    };
  })
  .build();

export let createPortfolio = SlateTool.create(spec, {
  name: 'Create Portfolio',
  key: 'create_portfolio',
  description: `Create a new portfolio in a workspace. Optionally add projects to it.`
})
  .input(
    z.object({
      workspaceId: z.string().describe('Workspace GID'),
      name: z.string().describe('Portfolio name'),
      color: z.string().optional().describe('Portfolio color'),
      isPublic: z
        .boolean()
        .optional()
        .describe('Whether the portfolio is visible to the workspace'),
      projectIds: z
        .array(z.string())
        .optional()
        .describe('Project GIDs to add to the portfolio')
    })
  )
  .output(
    z.object({
      portfolioId: z.string(),
      name: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.color) data.color = ctx.input.color;
    if (ctx.input.isPublic !== undefined) data.public = ctx.input.isPublic;

    let portfolio = await client.createPortfolio(ctx.input.workspaceId, data);

    if (ctx.input.projectIds?.length) {
      await Promise.all(
        ctx.input.projectIds.map(pid => client.addItemToPortfolio(portfolio.gid, pid))
      );
    }

    return {
      output: {
        portfolioId: portfolio.gid,
        name: portfolio.name
      },
      message: `Created portfolio **${portfolio.name}** (${portfolio.gid}).`
    };
  })
  .build();

export let updatePortfolio = SlateTool.create(spec, {
  name: 'Update Portfolio',
  key: 'update_portfolio',
  description: `Update a portfolio's properties and manage its project items. Supports adding and removing projects from the portfolio.`
})
  .input(
    z.object({
      portfolioId: z.string().describe('Portfolio GID'),
      name: z.string().optional().describe('New portfolio name'),
      color: z.string().optional().describe('New portfolio color'),
      isPublic: z.boolean().optional().describe('Whether the portfolio is visible'),
      addProjectIds: z.array(z.string()).optional().describe('Project GIDs to add'),
      removeProjectIds: z.array(z.string()).optional().describe('Project GIDs to remove')
    })
  )
  .output(
    z.object({
      portfolioId: z.string(),
      name: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, any> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.color !== undefined) data.color = ctx.input.color;
    if (ctx.input.isPublic !== undefined) data.public = ctx.input.isPublic;

    let portfolio = await client.updatePortfolio(ctx.input.portfolioId, data);

    let operations: Promise<any>[] = [];
    if (ctx.input.addProjectIds?.length) {
      for (let pid of ctx.input.addProjectIds) {
        operations.push(client.addItemToPortfolio(ctx.input.portfolioId, pid));
      }
    }
    if (ctx.input.removeProjectIds?.length) {
      for (let pid of ctx.input.removeProjectIds) {
        operations.push(client.removeItemFromPortfolio(ctx.input.portfolioId, pid));
      }
    }
    if (operations.length > 0) await Promise.all(operations);

    return {
      output: {
        portfolioId: portfolio.gid,
        name: portfolio.name
      },
      message: `Updated portfolio **${portfolio.name}** (${portfolio.gid}).`
    };
  })
  .build();
