import { SlateTool } from 'slates';
import { z } from 'zod';
import { lambdaServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let routingConfigSchema = z
  .object({
    additionalVersionWeights: z
      .record(z.string(), z.number())
      .optional()
      .describe(
        'Version-to-weight mapping for traffic shifting (e.g., {"2": 0.1} routes 10% to version 2)'
      )
  })
  .optional();

export let manageAlias = SlateTool.create(spec, {
  name: 'Manage Alias',
  key: 'manage_alias',
  description: `Create, update, get, delete, or list aliases for a Lambda function. Aliases are named pointers to function versions, enabling canary and blue/green deployments via weighted traffic shifting.`,
  instructions: [
    'Use **action** to specify the operation: "create", "update", "get", "delete", or "list".',
    'For traffic shifting, use routingConfig to split traffic between the primary version and one additional version.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'get', 'delete', 'list'])
        .describe('Operation to perform'),
      functionName: z.string().describe('Function name or ARN'),
      aliasName: z
        .string()
        .optional()
        .describe('Alias name (required for create/update/get/delete)'),
      functionVersion: z
        .string()
        .optional()
        .describe(
          'Function version the alias points to (required for create, optional for update)'
        ),
      description: z.string().optional().describe('Alias description'),
      routingConfig: routingConfigSchema.describe(
        'Traffic routing configuration for weighted aliases'
      )
    })
  )
  .output(
    z.object({
      aliasArn: z.string().optional().describe('Alias ARN'),
      aliasName: z.string().optional().describe('Alias name'),
      functionVersion: z.string().optional().describe('Version the alias points to'),
      description: z.string().optional().describe('Alias description'),
      routingConfig: z.any().optional().describe('Traffic routing configuration'),
      aliases: z
        .array(
          z.object({
            aliasArn: z.string().optional(),
            aliasName: z.string().optional(),
            functionVersion: z.string().optional(),
            description: z.string().optional()
          })
        )
        .optional()
        .describe('List of aliases (for list action)'),
      deleted: z.boolean().optional().describe('Whether the alias was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action, functionName, aliasName } = ctx.input;

    if (action === 'list') {
      let result = await client.listAliases(functionName);
      let aliases = (result.Aliases || []).map((a: any) => ({
        aliasArn: a.AliasArn,
        aliasName: a.Name,
        functionVersion: a.FunctionVersion,
        description: a.Description
      }));
      return {
        output: { aliases },
        message: `Found **${aliases.length}** alias(es) for **${functionName}**.`
      };
    }

    if (!aliasName) throw lambdaServiceError('aliasName is required for this action');

    if (action === 'get') {
      let result = await client.getAlias(functionName, aliasName);
      return {
        output: {
          aliasArn: result.AliasArn,
          aliasName: result.Name,
          functionVersion: result.FunctionVersion,
          description: result.Description,
          routingConfig: result.RoutingConfig
        },
        message: `Alias **${aliasName}** points to version **${result.FunctionVersion}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteAlias(functionName, aliasName);
      return {
        output: { deleted: true },
        message: `Deleted alias **${aliasName}** from function **${functionName}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.functionVersion)
        throw lambdaServiceError('functionVersion is required for creating an alias');
      let params: Record<string, any> = {
        Name: aliasName,
        FunctionVersion: ctx.input.functionVersion
      };
      if (ctx.input.description) params.Description = ctx.input.description;
      if (ctx.input.routingConfig?.additionalVersionWeights) {
        params.RoutingConfig = {
          AdditionalVersionWeights: ctx.input.routingConfig.additionalVersionWeights
        };
      }
      let result = await client.createAlias(functionName, params);
      return {
        output: {
          aliasArn: result.AliasArn,
          aliasName: result.Name,
          functionVersion: result.FunctionVersion,
          description: result.Description,
          routingConfig: result.RoutingConfig
        },
        message: `Created alias **${result.Name}** → version **${result.FunctionVersion}**.`
      };
    }

    // update
    let params: Record<string, any> = {};
    if (ctx.input.functionVersion) params.FunctionVersion = ctx.input.functionVersion;
    if (ctx.input.description !== undefined) params.Description = ctx.input.description;
    if (ctx.input.routingConfig?.additionalVersionWeights) {
      params.RoutingConfig = {
        AdditionalVersionWeights: ctx.input.routingConfig.additionalVersionWeights
      };
    }
    let result = await client.updateAlias(functionName, aliasName, params);
    return {
      output: {
        aliasArn: result.AliasArn,
        aliasName: result.Name,
        functionVersion: result.FunctionVersion,
        description: result.Description,
        routingConfig: result.RoutingConfig
      },
      message: `Updated alias **${result.Name}** → version **${result.FunctionVersion}**.`
    };
  })
  .build();
