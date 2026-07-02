import { SlateTool } from 'slates';
import { z } from 'zod';
import { NpmRegistryClient } from '../lib/client';
import { spec } from '../spec';

let trustedPublisherSchema = z
  .object({
    configurationId: z
      .string()
      .optional()
      .describe('UUID of the trusted publisher configuration'),
    providerType: z
      .string()
      .optional()
      .describe('CI/CD provider type (github, gitlab, circleci)'),
    claims: z
      .record(z.string(), z.string())
      .optional()
      .describe('Provider-specific claims (e.g. repository, environment)')
  })
  .passthrough();

export let manageTrustedPublishers = SlateTool.create(spec, {
  name: 'Manage Trusted Publishers',
  key: 'manage_trusted_publishers',
  description: `List, add, or remove trusted publisher (OIDC) configurations for an npm package. Trusted publishers allow CI/CD platforms (GitHub Actions, GitLab CI, CircleCI) to publish packages without long-lived npm tokens using OIDC token exchange.`,
  instructions: [
    '2FA must be enabled on the account and an OTP must be provided for all operations.',
    'When adding a GitHub Actions configuration, provide repository owner, repository name, and optionally the environment and workflow filename.'
  ],
  constraints: [
    'Requires 2FA to be enabled on the npm account.',
    'Only users with write permission to the package can manage trusted publishers.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      packageName: z
        .string()
        .describe('Full package name (e.g. "my-package" or "@scope/my-package")'),
      action: z
        .enum(['list', 'add', 'remove'])
        .describe('"list" to view configurations, "add" to create, "remove" to delete'),
      otp: z
        .string()
        .optional()
        .describe('One-time password for 2FA verification (required for all operations)'),
      providerType: z
        .enum(['github', 'gitlab', 'circleci'])
        .optional()
        .describe('CI/CD provider type (required for "add")'),
      claims: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Provider-specific claims for "add" (e.g. {"repository_owner": "owner", "repository": "repo", "environment": "production", "workflow_filename": "publish.yml"})'
        ),
      configurationId: z
        .string()
        .optional()
        .describe('Configuration UUID to remove (required for "remove")')
    })
  )
  .output(
    z.object({
      configurations: z
        .array(trustedPublisherSchema)
        .optional()
        .describe('Trusted publisher configurations'),
      added: trustedPublisherSchema.optional().describe('Newly added configuration'),
      removed: z
        .boolean()
        .optional()
        .describe('Whether the configuration was successfully removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NpmRegistryClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.getTrustedPublishers(ctx.input.packageName, ctx.input.otp);
      let configurations = (Array.isArray(result) ? result : []).map((c: any) => ({
        configurationId: c.uuid || c.id,
        providerType: c.type,
        claims: c.claims || c
      }));
      return {
        output: { configurations },
        message: `Found **${configurations.length}** trusted publisher configuration(s) for **${ctx.input.packageName}**.`
      };
    }

    if (ctx.input.action === 'add') {
      if (!ctx.input.providerType)
        throw new Error('providerType is required for "add" action.');
      if (!ctx.input.claims) throw new Error('claims are required for "add" action.');

      let config = [
        {
          type: ctx.input.providerType,
          ...ctx.input.claims
        }
      ];

      let result = await client.addTrustedPublisher(
        ctx.input.packageName,
        config,
        ctx.input.otp
      );
      let added =
        Array.isArray(result) && result[0]
          ? {
              configurationId: result[0].uuid || result[0].id,
              providerType: result[0].type || ctx.input.providerType,
              claims: result[0].claims || ctx.input.claims
            }
          : {
              providerType: ctx.input.providerType,
              claims: ctx.input.claims
            };

      return {
        output: { added },
        message: `Added **${ctx.input.providerType}** trusted publisher configuration to **${ctx.input.packageName}**.`
      };
    }

    if (ctx.input.action === 'remove') {
      if (!ctx.input.configurationId)
        throw new Error('configurationId is required for "remove" action.');

      await client.deleteTrustedPublisher(
        ctx.input.packageName,
        ctx.input.configurationId,
        ctx.input.otp
      );
      return {
        output: { removed: true },
        message: `Removed trusted publisher configuration \`${ctx.input.configurationId}\` from **${ctx.input.packageName}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
