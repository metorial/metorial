import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let managePortfolio = SlateTool.create(spec, {
  name: 'Manage Portfolio',
  key: 'manage_portfolio',
  description: `Create, retrieve, update, or delete portfolios in VEO. Portfolios organise and group content for structured presentation.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'create', 'update', 'delete'])
        .describe('Action to perform on the portfolio'),
      portfolioId: z
        .string()
        .optional()
        .describe('ID of the portfolio (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Portfolio name (required for create, optional for update)'),
      description: z.string().optional().describe('Portfolio description')
    })
  )
  .output(
    z.object({
      portfolio: z
        .record(z.string(), z.any())
        .optional()
        .describe('Portfolio data (for get and create)'),
      portfolioId: z.string().optional().describe('ID of the portfolio'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    if (ctx.input.action === 'get') {
      if (!ctx.input.portfolioId) {
        throw new Error('portfolioId is required for "get" action');
      }
      let portfolio = await client.getPortfolio(ctx.input.portfolioId);
      return {
        output: { portfolio, portfolioId: ctx.input.portfolioId, success: true },
        message: `Retrieved portfolio \`${ctx.input.portfolioId}\`.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) {
        throw new Error('name is required when creating a portfolio');
      }
      let result = await client.createPortfolio({
        name: ctx.input.name,
        description: ctx.input.description
      });
      let portfolioId = String(result.id ?? result.Id ?? result);
      return {
        output: { portfolio: result, portfolioId, success: true },
        message: `Created portfolio **"${ctx.input.name}"** with ID \`${portfolioId}\`.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.portfolioId) {
        throw new Error('portfolioId is required for "update" action');
      }
      await client.updatePortfolio(ctx.input.portfolioId, {
        name: ctx.input.name,
        description: ctx.input.description
      });
      return {
        output: { portfolioId: ctx.input.portfolioId, success: true },
        message: `Updated portfolio \`${ctx.input.portfolioId}\`.`
      };
    }

    if (!ctx.input.portfolioId) {
      throw new Error('portfolioId is required for "delete" action');
    }
    await client.deletePortfolio(ctx.input.portfolioId);
    return {
      output: { portfolioId: ctx.input.portfolioId, success: true },
      message: `Deleted portfolio \`${ctx.input.portfolioId}\`.`
    };
  })
  .build();
