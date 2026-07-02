import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let standardizationErrorSchema = z
  .object({
    line: z.number().optional().describe('Line number where the issue was found'),
    description: z.string().optional().describe('Description of the issue'),
    severity: z.string().optional().describe('Severity level (ERROR, WARNING, INFO)'),
    ruleName: z
      .string()
      .optional()
      .describe('Name of the standardization rule that triggered'),
    path: z.string().optional().describe('Path in the spec where the issue was found')
  })
  .passthrough();

export let runStandardization = SlateTool.create(spec, {
  name: 'Run Standardization Scan',
  key: 'run_standardization',
  description: `Run a standardization scan against an API definition in SwaggerHub. Returns validation results including severity, rule name, and location for each error or warning. Use this to check compliance with organization style guides before publishing.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z
        .string()
        .optional()
        .describe('API owner (username or organization). Falls back to config owner.'),
      apiName: z.string().describe('Name of the API to scan'),
      version: z.string().describe('API version to scan')
    })
  )
  .output(
    z.object({
      errors: z.array(standardizationErrorSchema).describe('Standardization issues found'),
      errorCount: z.number().describe('Total number of issues')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let owner = ctx.input.owner || ctx.config.owner;
    if (!owner)
      throw new Error(
        'Owner is required. Provide it in the input or configure a default owner.'
      );

    let result = await client.getStandardizationErrors(
      owner,
      ctx.input.apiName,
      ctx.input.version
    );
    let errors = Array.isArray(result) ? result : (result?.errors ?? result?.items ?? []);

    return {
      output: {
        errors,
        errorCount: errors.length
      },
      message:
        errors.length > 0
          ? `Found **${errors.length}** standardization issue(s) in **${owner}/${ctx.input.apiName}** v${ctx.input.version}.`
          : `No standardization issues found in **${owner}/${ctx.input.apiName}** v${ctx.input.version}. ✓`
    };
  })
  .build();
