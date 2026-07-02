import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkSubgraph = SlateTool.create(spec, {
  name: 'Check Subgraph Schema',
  key: 'check_subgraph',
  description: `Runs composition and breaking change checks against a subgraph schema without publishing it. Use this in CI/CD workflows to validate schema changes before they go live.

Detects breaking changes including: field removals, type changes, removed arguments, new required fields, and more. Also runs lint checks for naming conventions.`,
  instructions: [
    'Run checks before publishing to ensure safe schema evolution.',
    'A non-empty breakingChanges array indicates the schema may break existing clients.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      graphId: z.string().describe('ID of the federated graph'),
      subgraphName: z.string().describe('Identifier for the subgraph to check'),
      schema: z.string().describe('GraphQL SDL schema to validate'),
      branch: z
        .string()
        .optional()
        .describe('Target branch name. Defaults to the production branch.')
    })
  )
  .output(
    z.object({
      passed: z.boolean().describe('Whether the check passed without errors'),
      compositionErrors: z
        .array(z.string())
        .optional()
        .describe('Composition errors found during schema composition'),
      breakingChanges: z
        .array(
          z.object({
            severity: z.string().describe('Severity of the breaking change'),
            message: z.string().describe('Description of the breaking change'),
            path: z.string().optional().describe('Schema path affected by the change')
          })
        )
        .optional()
        .describe('Breaking changes detected based on operation usage analysis'),
      lintErrors: z
        .array(
          z.object({
            message: z.string().describe('Description of the lint issue'),
            severity: z.string().describe('Severity of the lint issue')
          })
        )
        .optional()
        .describe('Lint rule violations found in the schema')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let result = await client.checkSubgraph({
      graphId: ctx.input.graphId,
      name: ctx.input.subgraphName,
      schema: ctx.input.schema,
      branch: ctx.input.branch
    });

    let compositionErrors = result.compositionErrors || [];
    let breakingChanges = result.breakingChanges || [];
    let lintErrors = result.lintErrors || [];
    let passed = compositionErrors.length === 0 && breakingChanges.length === 0;

    return {
      output: {
        passed,
        compositionErrors: compositionErrors.length > 0 ? compositionErrors : undefined,
        breakingChanges: breakingChanges.length > 0 ? breakingChanges : undefined,
        lintErrors: lintErrors.length > 0 ? lintErrors : undefined
      },
      message: passed
        ? `Schema check **passed** for subgraph **${ctx.input.subgraphName}**. No breaking changes or composition errors detected.`
        : `Schema check completed for **${ctx.input.subgraphName}**: ${compositionErrors.length} composition error(s), ${breakingChanges.length} breaking change(s), ${lintErrors.length} lint issue(s).`
    };
  })
  .build();
