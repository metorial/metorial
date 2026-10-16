import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { NpmRegistryClient } from '../lib/client';
import { array, optionalText, record, text } from '../lib/response';
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
      permissions: z
        .array(z.enum(['createPackage', 'createStagedPackage', 'manageDistTags']))
        .optional()
        .describe('Permissions granted to the publisher (required for add).'),
      nativeClaims: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Provider-native claims object, including structured workflow_ref matching. Overrides claims when provided.'
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
      rawConfigurations: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe(
          'Unmodified provider configurations, including structured claims and permissions'
        ),
      removed: z
        .boolean()
        .optional()
        .describe('Whether the configuration was successfully removed')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.otp)
      throw createApiServiceError(
        'An OTP is required to manage trusted publishers. Obtain it from your configured 2FA method.'
      );
    let client = new NpmRegistryClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = array(
        await client.getTrustedPublishers(ctx.input.packageName, ctx.input.otp),
        'trusted publisher configurations'
      );
      let rawConfigurations = result.map(value =>
        record(value, 'trusted publisher configuration')
      );
      let configurations = rawConfigurations.map(mapConfiguration);
      return {
        output: { configurations, rawConfigurations },
        message: `Found **${configurations.length}** trusted publisher configuration(s) for **${ctx.input.packageName}**.`
      };
    }

    if (ctx.input.action === 'add') {
      if (!ctx.input.providerType)
        throw createApiServiceError('providerType is required for "add" action.');
      if (!ctx.input.nativeClaims && !ctx.input.claims)
        throw createApiServiceError('claims or nativeClaims is required for "add" action.');
      if (!ctx.input.permissions?.length)
        throw createApiServiceError(
          'permissions is required for "add" action. Select the publisher permissions to grant.'
        );
      let claims: Record<string, unknown> = {
        ...(ctx.input.nativeClaims ?? ctx.input.claims)
      };
      if (!ctx.input.nativeClaims && ctx.input.providerType === 'github') {
        if (
          typeof claims.repository_owner === 'string' &&
          typeof claims.repository === 'string' &&
          !claims.repository.includes('/')
        ) {
          claims.repository = `${claims.repository_owner}/${claims.repository}`;
        }
        claims.repository_owner = undefined;
        if (typeof claims.workflow_filename === 'string') {
          claims.workflow_ref = { file: claims.workflow_filename };
          claims.workflow_filename = undefined;
        }
      }
      let result = array(
        await client.addTrustedPublisher(
          ctx.input.packageName,
          [
            {
              type: ctx.input.providerType,
              claims,
              permissions: ctx.input.permissions
            }
          ],
          ctx.input.otp
        ),
        'created trusted publisher configurations'
      );
      if (result.length === 0)
        throw createApiServiceError(
          'npm did not confirm the trusted publisher configuration. Check package settings before retrying.'
        );
      let rawConfigurations = result.map(value =>
        record(value, 'trusted publisher configuration')
      );
      return {
        output: { added: mapConfiguration(rawConfigurations[0]), rawConfigurations },
        message: `Added **${ctx.input.providerType}** trusted publisher configuration to **${ctx.input.packageName}**.`
      };
    }

    if (ctx.input.action === 'remove') {
      if (!ctx.input.configurationId)
        throw createApiServiceError('configurationId is required for "remove" action.');

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

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();

function mapConfiguration(value: unknown) {
  let configuration = record(value, 'trusted publisher configuration');
  let claims = record(configuration.claims, 'trusted publisher claims');
  // The original output is a string map. Native structured matching remains available verbatim.
  return {
    configurationId: optionalText(configuration.uuid ?? configuration.id, 'configuration ID'),
    providerType: text(configuration.type, 'trusted publisher type'),
    claims: Object.fromEntries(
      Object.entries(claims).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string'
      )
    )
  };
}
