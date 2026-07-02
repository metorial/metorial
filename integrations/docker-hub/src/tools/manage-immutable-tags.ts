import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { dockerHubServiceError } from '../lib/errors';
import { spec } from '../spec';

export let updateRepositoryImmutableTags = SlateTool.create(spec, {
  name: 'Update Repository Immutable Tags',
  key: 'update_repository_immutable_tags',
  description: `Update immutable tag settings for a Docker Hub repository. Immutable tags prevent matching image tags from being overwritten after they are pushed.`,
  instructions: [
    'Only users with administrative privileges for the repository can modify immutable tag settings.',
    'When enabling immutable tags, provide at least one regex rule.'
  ]
})
  .input(
    z.object({
      namespace: z
        .string()
        .optional()
        .describe(
          'Docker Hub namespace (username or organization). Falls back to configured default namespace.'
        ),
      repositoryName: z.string().describe('Name of the repository.'),
      enabled: z.boolean().describe('Whether immutable tags should be enabled.'),
      rules: z
        .array(z.string())
        .optional()
        .describe('Immutable tag regex rules. Required when enabled is true.')
    })
  )
  .output(
    z.object({
      namespace: z.string().describe('Namespace the repository belongs to.'),
      repositoryName: z.string().describe('Name of the repository.'),
      immutableTags: z.object({
        enabled: z.boolean().describe('Whether immutable tags are enabled.'),
        rules: z.array(z.string()).describe('Immutable tag regex rules.')
      })
    })
  )
  .handleInvocation(async ctx => {
    let ns = ctx.input.namespace || ctx.config.namespace || ctx.auth.username;
    let rules = ctx.input.rules || [];

    if (ctx.input.enabled && rules.length === 0) {
      throw dockerHubServiceError(
        'Provide at least one immutable tag rule when enabling immutable tags.'
      );
    }

    let client = new Client(ctx.auth);
    let repo = await client.updateRepositoryImmutableTags(ns, ctx.input.repositoryName, {
      immutable_tags: ctx.input.enabled,
      immutable_tags_rules: rules
    });

    return {
      output: {
        namespace: repo.namespace,
        repositoryName: repo.name,
        immutableTags: repo.immutable_tags_settings || {
          enabled: ctx.input.enabled,
          rules
        }
      },
      message: `Updated immutable tag settings for **${ns}/${ctx.input.repositoryName}**.`
    };
  })
  .build();

export let verifyRepositoryImmutableTags = SlateTool.create(spec, {
  name: 'Verify Repository Immutable Tags',
  key: 'verify_repository_immutable_tags',
  description: `Validate an immutable tag regex rule for a Docker Hub repository and return repository tags that match the rule.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      namespace: z
        .string()
        .optional()
        .describe(
          'Docker Hub namespace (username or organization). Falls back to configured default namespace.'
        ),
      repositoryName: z.string().describe('Name of the repository.'),
      regex: z.string().describe('Immutable tag regex rule to validate.')
    })
  )
  .output(
    z.object({
      matchingTags: z.array(z.string()).describe('Repository tags that match the regex.')
    })
  )
  .handleInvocation(async ctx => {
    let ns = ctx.input.namespace || ctx.config.namespace || ctx.auth.username;

    let client = new Client(ctx.auth);
    let result = await client.verifyRepositoryImmutableTags(
      ns,
      ctx.input.repositoryName,
      ctx.input.regex
    );

    return {
      output: {
        matchingTags: result.tags || []
      },
      message: `Verified immutable tag rule for **${ns}/${ctx.input.repositoryName}**.`
    };
  })
  .build();
