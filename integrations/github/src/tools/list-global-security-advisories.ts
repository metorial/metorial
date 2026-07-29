import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

let ecosystemSchema = z.enum([
  'actions',
  'composer',
  'erlang',
  'go',
  'maven',
  'npm',
  'nuget',
  'other',
  'pip',
  'pub',
  'rubygems',
  'rust'
]);

export let listGlobalSecurityAdvisories = SlateTool.create(spec, {
  name: 'List Global Security Advisories',
  key: 'list_global_security_advisories',
  description: 'List global security advisories from GitHub.',
  tags: { readOnly: true }
})
  .scopes(anyOf('repo', 'security_events'))
  .input(
    z.object({
      ghsaId: z
        .string()
        .optional()
        .describe('Filter by GitHub Security Advisory ID (format: GHSA-xxxx-xxxx-xxxx).'),
      type: z
        .enum(['reviewed', 'malware', 'unreviewed'])
        .default('reviewed')
        .optional()
        .describe('Advisory type.'),
      cveId: z.string().optional().describe('Filter by CVE ID.'),
      ecosystem: ecosystemSchema.optional().describe('Filter by package ecosystem.'),
      severity: z
        .enum(['unknown', 'low', 'medium', 'high', 'critical'])
        .optional()
        .describe('Filter by severity.'),
      cwes: z
        .array(z.string())
        .optional()
        .describe('Filter by Common Weakness Enumeration IDs (e.g. ["79", "284", "22"]).'),
      isWithdrawn: z
        .boolean()
        .optional()
        .describe('Whether to only return withdrawn advisories.'),
      affects: z
        .string()
        .optional()
        .describe(
          'Filter advisories by affected package or version (e.g. "package1,package2@1.0.0").'
        ),
      published: z
        .string()
        .optional()
        .describe('Filter by publish date or date range (ISO 8601 date or range).'),
      updated: z
        .string()
        .optional()
        .describe('Filter by update date or date range (ISO 8601 date or range).'),
      modified: z
        .string()
        .optional()
        .describe('Filter by publish or update date or date range (ISO 8601 date or range).')
    })
  )
  .output(
    z.object({
      advisories: z.array(z.record(z.string(), z.any())),
      returnedCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient(ctx.auth);
    let advisories = await client.listGlobalSecurityAdvisories(ctx.input);
    return {
      output: {
        advisories,
        returnedCount: advisories.length
      },
      message: `Retrieved **${advisories.length}** global security advisories from GitHub.`
    };
  })
  .build();
