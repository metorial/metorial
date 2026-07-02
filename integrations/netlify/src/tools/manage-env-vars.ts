import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let envVarValueSchema = z.object({
  value: z.string().describe('The environment variable value'),
  context: z
    .enum([
      'all',
      'dev',
      'dev-server',
      'branch',
      'branch-deploy',
      'deploy-preview',
      'production'
    ])
    .describe('Deploy context for this value'),
  contextParameter: z.string().optional().describe('Branch name when context is "branch"')
});

let envVarOutputSchema = z.object({
  key: z.string().describe('Environment variable key'),
  scopes: z
    .array(z.string())
    .optional()
    .describe('Netlify scopes where the variable is available'),
  values: z.array(
    z.object({
      valueId: z.string().optional().describe('Value identifier'),
      value: z.string().describe('The value'),
      context: z.string().describe('Deploy context'),
      contextParameter: z.string().optional().describe('Branch name for branch-deploy context')
    })
  ),
  isSecret: z.boolean().optional().describe('Whether the variable is marked as secret'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapEnvVar = (envVar: any) => ({
  key: envVar.key,
  scopes: envVar.scopes,
  values: (envVar.values || []).map((v: any) => ({
    valueId: v.id,
    value: v.value,
    context: v.context,
    contextParameter: v.context_parameter
  })),
  isSecret: envVar.is_secret,
  updatedAt: envVar.updated_at
});

export let listEnvVars = SlateTool.create(spec, {
  name: 'List Environment Variables',
  key: 'list_env_vars',
  description: `List all environment variables for a Netlify account. Optionally filter by a specific site. Shows values per deploy context.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z.string().describe('Account/team ID'),
      siteId: z
        .string()
        .optional()
        .describe('Filter by site ID to show site-specific variables')
    })
  )
  .output(
    z.object({
      envVars: z.array(envVarOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let envVars = await client.listEnvVars(ctx.input.accountId, ctx.input.siteId);

    let mapped = envVars.map(mapEnvVar);

    return {
      output: { envVars: mapped },
      message: `Found **${mapped.length}** environment variable(s).`
    };
  })
  .build();

export let setEnvVars = SlateTool.create(spec, {
  name: 'Set Environment Variables',
  key: 'set_env_vars',
  description: `Create or update environment variables for a Netlify account. Variables can have different values per deploy context (production, deploy-preview, branch-deploy, dev). If a variable already exists, it will be fully replaced.`,
  instructions: [
    'Use context "all" to set a single value across all deploy contexts.',
    'Use specific contexts to set different values per environment.'
  ]
})
  .input(
    z.object({
      accountId: z.string().describe('Account/team ID'),
      siteId: z
        .string()
        .optional()
        .describe('Site ID to scope the variables to a specific site'),
      mode: z
        .enum(['create', 'replace'])
        .default('create')
        .describe(
          'Use "create" for new variables or "replace" to fully replace existing variables by key'
        ),
      variables: z
        .array(
          z.object({
            key: z.string().describe('Environment variable key'),
            scopes: z
              .array(z.enum(['builds', 'functions', 'runtime', 'post-processing']))
              .optional()
              .describe('Scopes where this variable is available'),
            isSecret: z
              .boolean()
              .optional()
              .describe('Whether Netlify should treat values as secret'),
            values: z.array(envVarValueSchema).describe('Values per deploy context')
          })
        )
        .describe('Environment variables to create or update')
    })
  )
  .output(
    z.object({
      envVars: z.array(envVarOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let apiVars = ctx.input.variables.map(v => ({
      key: v.key,
      scopes: v.scopes,
      is_secret: v.isSecret,
      values: v.values.map(val => ({
        value: val.value,
        context: val.context,
        context_parameter: val.contextParameter
      }))
    }));

    let results =
      ctx.input.mode === 'replace'
        ? await Promise.all(
            apiVars.map(v =>
              client.updateEnvVar(ctx.input.accountId, v.key, v, ctx.input.siteId)
            )
          )
        : [await client.createEnvVars(ctx.input.accountId, apiVars, ctx.input.siteId)];

    let mapped = results.flatMap(result =>
      (Array.isArray(result) ? result : [result]).map(mapEnvVar)
    );

    return {
      output: { envVars: mapped },
      message: `Set **${mapped.length}** environment variable(s).`
    };
  })
  .build();

export let deleteEnvVar = SlateTool.create(spec, {
  name: 'Delete Environment Variable',
  key: 'delete_env_var',
  description: `Delete an environment variable from a Netlify account. Optionally scope to a specific site.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      accountId: z.string().describe('Account/team ID'),
      key: z.string().describe('Environment variable key to delete'),
      siteId: z.string().optional().describe('Site ID to delete a site-scoped variable')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the variable was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteEnvVar(ctx.input.accountId, ctx.input.key, ctx.input.siteId);

    return {
      output: { deleted: true },
      message: `Deleted environment variable **${ctx.input.key}**.`
    };
  })
  .build();
