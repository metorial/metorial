import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let guardrailInputSchema = z.object({
  name: z.string().optional().describe('Guardrail name'),
  budgetLimit: z.number().optional().describe('Spending limit in credits'),
  budgetResetInterval: z
    .enum(['daily', 'weekly', 'monthly'])
    .optional()
    .describe('How often the budget resets'),
  modelAllowlist: z.array(z.string()).optional().describe('Only allow these model IDs'),
  modelDenylist: z.array(z.string()).optional().describe('Block these model IDs'),
  providerAllowlist: z.array(z.string()).optional().describe('Only allow these providers'),
  providerDenylist: z.array(z.string()).optional().describe('Block these providers'),
  zdr: z.boolean().optional().describe('Enable Zero Data Retention for this guardrail')
});

let guardrailOutputSchema = z.object({
  guardrailId: z.string().optional().describe('Unique guardrail identifier'),
  name: z.string().optional().describe('Guardrail name'),
  budgetLimit: z.number().optional().describe('Spending limit'),
  budgetResetInterval: z.string().optional().describe('Budget reset interval'),
  modelAllowlist: z.array(z.string()).optional().describe('Allowed models'),
  modelDenylist: z.array(z.string()).optional().describe('Blocked models'),
  providerAllowlist: z.array(z.string()).optional().describe('Allowed providers'),
  providerDenylist: z.array(z.string()).optional().describe('Blocked providers'),
  zdr: z.boolean().optional().describe('Zero Data Retention enabled'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

let normalizeGuardrail = (data: Record<string, unknown>) => ({
  guardrailId: (data.id as string) || undefined,
  name: (data.name as string) || undefined,
  budgetLimit: (data.budget_limit as number) || undefined,
  budgetResetInterval: (data.budget_reset_interval as string) || undefined,
  modelAllowlist: (data.model_allowlist as string[]) || undefined,
  modelDenylist: (data.model_denylist as string[]) || undefined,
  providerAllowlist: (data.provider_allowlist as string[]) || undefined,
  providerDenylist: (data.provider_denylist as string[]) || undefined,
  zdr: (data.zdr as boolean) || undefined,
  createdAt: data.created_at ? String(data.created_at) : undefined
});

export let listGuardrails = SlateTool.create(spec, {
  name: 'List Guardrails',
  key: 'list_guardrails',
  description: `List all guardrails configured for your OpenRouter organization. Guardrails control spending limits, model/provider restrictions, and data privacy policies.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      guardrails: z.array(guardrailOutputSchema).describe('List of guardrails')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      siteUrl: ctx.config.siteUrl,
      appTitle: ctx.config.appTitle
    });

    let rawGuardrails = await client.listGuardrails();
    let guardrails = (Array.isArray(rawGuardrails) ? rawGuardrails : []).map(
      normalizeGuardrail
    );

    return {
      output: { guardrails },
      message: `Found **${guardrails.length}** guardrail(s).`
    };
  })
  .build();

export let createGuardrail = SlateTool.create(spec, {
  name: 'Create Guardrail',
  key: 'create_guardrail',
  description: `Create a new guardrail to control spending limits, model/provider access, and data privacy policies for your OpenRouter organization.`,
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
      budgetLimit: ctx.input.budgetLimit,
      budgetResetInterval: ctx.input.budgetResetInterval,
      modelAllowlist: ctx.input.modelAllowlist,
      modelDenylist: ctx.input.modelDenylist,
      providerAllowlist: ctx.input.providerAllowlist,
      providerDenylist: ctx.input.providerDenylist,
      zdr: ctx.input.zdr
    });

    let data = (result.data as Record<string, unknown>) || result;
    let output = normalizeGuardrail(data);

    return {
      output,
      message: `Created guardrail **${output.name || ctx.input.name}**.`
    };
  })
  .build();

export let updateGuardrail = SlateTool.create(spec, {
  name: 'Update Guardrail',
  key: 'update_guardrail',
  description: `Update an existing guardrail's configuration including spending limits, model/provider restrictions, and data privacy settings.`,
  tags: {
    destructive: false
  }
})
  .input(
    z
      .object({
        guardrailId: z.string().describe('ID of the guardrail to update')
      })
      .merge(guardrailInputSchema)
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
      budgetLimit: ctx.input.budgetLimit,
      budgetResetInterval: ctx.input.budgetResetInterval,
      modelAllowlist: ctx.input.modelAllowlist,
      modelDenylist: ctx.input.modelDenylist,
      providerAllowlist: ctx.input.providerAllowlist,
      providerDenylist: ctx.input.providerDenylist,
      zdr: ctx.input.zdr
    });

    let data = (result.data as Record<string, unknown>) || result;
    let output = normalizeGuardrail(data);

    return {
      output,
      message: `Updated guardrail **${output.name || ctx.input.guardrailId}**.`
    };
  })
  .build();

export let deleteGuardrail = SlateTool.create(spec, {
  name: 'Delete Guardrail',
  key: 'delete_guardrail',
  description: `Delete a guardrail by its ID. This is irreversible — all restrictions from this guardrail will be removed immediately.`,
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
