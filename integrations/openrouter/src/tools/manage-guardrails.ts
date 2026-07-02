import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contentFilterSchema = z.record(z.string(), z.unknown());

let guardrailInputSchema = z.object({
  name: z.string().optional().describe('Guardrail name'),
  description: z.string().nullable().optional().describe('Guardrail description'),
  limitUsd: z.number().nullable().optional().describe('Spending limit in USD'),
  resetInterval: z
    .enum(['daily', 'weekly', 'monthly'])
    .optional()
    .describe('How often the spending limit resets'),
  allowedModels: z
    .array(z.string())
    .nullable()
    .optional()
    .describe('Only allow these model identifiers; null removes the allowlist'),
  ignoredModels: z
    .array(z.string())
    .nullable()
    .optional()
    .describe('Exclude these model identifiers from routing; null removes the denylist'),
  allowedProviders: z
    .array(z.string())
    .nullable()
    .optional()
    .describe('Only allow these provider IDs; null removes the allowlist'),
  ignoredProviders: z
    .array(z.string())
    .nullable()
    .optional()
    .describe('Exclude these provider IDs from routing; null removes the denylist'),
  enforceZdr: z
    .boolean()
    .nullable()
    .optional()
    .describe('Deprecated global ZDR switch; prefer per-provider ZDR fields'),
  enforceZdrAnthropic: z
    .boolean()
    .nullable()
    .optional()
    .describe('Whether to enforce zero data retention for Anthropic models'),
  enforceZdrGoogle: z
    .boolean()
    .nullable()
    .optional()
    .describe('Whether to enforce zero data retention for Google models'),
  enforceZdrOpenAI: z
    .boolean()
    .nullable()
    .optional()
    .describe('Whether to enforce zero data retention for OpenAI models'),
  enforceZdrOther: z
    .boolean()
    .nullable()
    .optional()
    .describe('Whether to enforce zero data retention for other providers'),
  contentFilters: z
    .array(contentFilterSchema)
    .nullable()
    .optional()
    .describe('Custom regex content filters; null removes them on update'),
  contentFilterBuiltins: z
    .array(contentFilterSchema)
    .nullable()
    .optional()
    .describe('Builtin content filters; null removes them on update'),
  workspaceId: z.string().optional().describe('Workspace ID for guardrail creation')
});

let guardrailOutputSchema = z.object({
  guardrailId: z.string().optional().describe('Unique guardrail identifier'),
  name: z.string().optional().describe('Guardrail name'),
  workspaceId: z.string().optional().describe('Workspace ID'),
  description: z.string().nullable().optional().describe('Guardrail description'),
  limitUsd: z.number().nullable().optional().describe('Spending limit in USD'),
  resetInterval: z.string().optional().describe('Limit reset interval'),
  allowedModels: z.array(z.string()).nullable().optional().describe('Allowed models'),
  ignoredModels: z.array(z.string()).nullable().optional().describe('Ignored models'),
  allowedProviders: z.array(z.string()).nullable().optional().describe('Allowed providers'),
  ignoredProviders: z.array(z.string()).nullable().optional().describe('Ignored providers'),
  enforceZdr: z.boolean().nullable().optional().describe('Deprecated global ZDR setting'),
  enforceZdrAnthropic: z.boolean().nullable().optional().describe('Anthropic ZDR enforcement'),
  enforceZdrGoogle: z.boolean().nullable().optional().describe('Google ZDR enforcement'),
  enforceZdrOpenAI: z.boolean().nullable().optional().describe('OpenAI ZDR enforcement'),
  enforceZdrOther: z
    .boolean()
    .nullable()
    .optional()
    .describe('Other provider ZDR enforcement'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp')
});

let booleanOrNull = (value: unknown) =>
  value === null || typeof value === 'boolean' ? value : undefined;

let normalizeGuardrail = (data: Record<string, unknown>) => ({
  guardrailId: (data.id as string) || undefined,
  name: (data.name as string) || undefined,
  workspaceId: (data.workspace_id as string) || undefined,
  description:
    data.description !== undefined ? (data.description as string | null) : undefined,
  limitUsd: data.limit_usd !== undefined ? (data.limit_usd as number | null) : undefined,
  resetInterval: (data.reset_interval as string) || undefined,
  allowedModels:
    data.allowed_models !== undefined ? (data.allowed_models as string[] | null) : undefined,
  ignoredModels:
    data.ignored_models !== undefined ? (data.ignored_models as string[] | null) : undefined,
  allowedProviders:
    data.allowed_providers !== undefined
      ? (data.allowed_providers as string[] | null)
      : undefined,
  ignoredProviders:
    data.ignored_providers !== undefined
      ? (data.ignored_providers as string[] | null)
      : undefined,
  enforceZdr: booleanOrNull(data.enforce_zdr),
  enforceZdrAnthropic: booleanOrNull(data.enforce_zdr_anthropic),
  enforceZdrGoogle: booleanOrNull(data.enforce_zdr_google),
  enforceZdrOpenAI: booleanOrNull(data.enforce_zdr_openai),
  enforceZdrOther: booleanOrNull(data.enforce_zdr_other),
  createdAt: data.created_at ? String(data.created_at) : undefined,
  updatedAt: data.updated_at !== undefined ? (data.updated_at as string | null) : undefined
});

export let listGuardrails = SlateTool.create(spec, {
  name: 'List Guardrails',
  key: 'list_guardrails',
  description: `List OpenRouter guardrails for the authenticated account, including spending limits, model/provider allowlists and denylists, ZDR enforcement, workspace, and pagination metadata. Requires a Management API key.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().min(1).max(100).optional().describe('Maximum guardrails to return'),
      offset: z.number().min(0).optional().describe('Number of records to skip'),
      workspaceId: z.string().optional().describe('Filter guardrails by workspace ID')
    })
  )
  .output(
    z.object({
      guardrails: z.array(guardrailOutputSchema).describe('List of guardrails'),
      totalCount: z.number().optional().describe('Total guardrail count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      siteUrl: ctx.config.siteUrl,
      appTitle: ctx.config.appTitle
    });

    let result = await client.listGuardrails({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      workspaceId: ctx.input.workspaceId
    });
    let guardrails = result.guardrails.map(normalizeGuardrail);

    return {
      output: { guardrails, totalCount: result.totalCount },
      message: `Found **${guardrails.length}** guardrail(s).`
    };
  })
  .build();

export let createGuardrail = SlateTool.create(spec, {
  name: 'Create Guardrail',
  key: 'create_guardrail',
  description: `Create an OpenRouter guardrail to control spending, provider/model routing, content filters, workspace scope, and zero-data-retention requirements. Requires a Management API key.`,
  tags: {
    destructive: false
  }
})
  .input(guardrailInputSchema.required({ name: true }))
  .output(guardrailOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      siteUrl: ctx.config.siteUrl,
      appTitle: ctx.config.appTitle
    });

    let result = await client.createGuardrail({
      name: ctx.input.name!,
      description: ctx.input.description,
      limitUsd: ctx.input.limitUsd,
      resetInterval: ctx.input.resetInterval,
      allowedModels: ctx.input.allowedModels,
      ignoredModels: ctx.input.ignoredModels,
      allowedProviders: ctx.input.allowedProviders,
      ignoredProviders: ctx.input.ignoredProviders,
      enforceZdr: ctx.input.enforceZdr,
      enforceZdrAnthropic: ctx.input.enforceZdrAnthropic,
      enforceZdrGoogle: ctx.input.enforceZdrGoogle,
      enforceZdrOpenAI: ctx.input.enforceZdrOpenAI,
      enforceZdrOther: ctx.input.enforceZdrOther,
      contentFilters: ctx.input.contentFilters,
      contentFilterBuiltins: ctx.input.contentFilterBuiltins,
      workspaceId: ctx.input.workspaceId
    });

    let output = normalizeGuardrail(result);

    return {
      output,
      message: `Created guardrail **${output.name || ctx.input.name}**.`
    };
  })
  .build();

export let getGuardrail = SlateTool.create(spec, {
  name: 'Get Guardrail',
  key: 'get_guardrail',
  description: 'Retrieve a single OpenRouter guardrail by ID. Requires a Management API key.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      guardrailId: z.string().describe('ID of the guardrail to retrieve')
    })
  )
  .output(guardrailOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      siteUrl: ctx.config.siteUrl,
      appTitle: ctx.config.appTitle
    });

    let data = await client.getGuardrail(ctx.input.guardrailId);
    let output = normalizeGuardrail(data);

    return {
      output,
      message: `Retrieved guardrail **${output.name || ctx.input.guardrailId}**.`
    };
  })
  .build();

export let updateGuardrail = SlateTool.create(spec, {
  name: 'Update Guardrail',
  key: 'update_guardrail',
  description: `Update an OpenRouter guardrail's name, description, spending limit, provider/model restrictions, content filters, or ZDR settings. Requires a Management API key.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      guardrailId: z.string().describe('ID of the guardrail to update'),
      ...guardrailInputSchema.shape
    })
  )
  .output(guardrailOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      siteUrl: ctx.config.siteUrl,
      appTitle: ctx.config.appTitle
    });

    let result = await client.updateGuardrail(ctx.input.guardrailId, {
      name: ctx.input.name,
      description: ctx.input.description,
      limitUsd: ctx.input.limitUsd,
      resetInterval: ctx.input.resetInterval,
      allowedModels: ctx.input.allowedModels,
      ignoredModels: ctx.input.ignoredModels,
      allowedProviders: ctx.input.allowedProviders,
      ignoredProviders: ctx.input.ignoredProviders,
      enforceZdr: ctx.input.enforceZdr,
      enforceZdrAnthropic: ctx.input.enforceZdrAnthropic,
      enforceZdrGoogle: ctx.input.enforceZdrGoogle,
      enforceZdrOpenAI: ctx.input.enforceZdrOpenAI,
      enforceZdrOther: ctx.input.enforceZdrOther,
      contentFilters: ctx.input.contentFilters,
      contentFilterBuiltins: ctx.input.contentFilterBuiltins
    });

    let output = normalizeGuardrail(result);

    return {
      output,
      message: `Updated guardrail **${output.name || ctx.input.guardrailId}**.`
    };
  })
  .build();

export let deleteGuardrail = SlateTool.create(spec, {
  name: 'Delete Guardrail',
  key: 'delete_guardrail',
  description: `Delete an OpenRouter guardrail by ID. This is irreversible and removes its restrictions immediately. Requires a Management API key.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      guardrailId: z.string().describe('ID of the guardrail to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the guardrail was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      siteUrl: ctx.config.siteUrl,
      appTitle: ctx.config.appTitle
    });

    await client.deleteGuardrail(ctx.input.guardrailId);

    return {
      output: { deleted: true },
      message: `Deleted guardrail **${ctx.input.guardrailId}**.`
    };
  })
  .build();
