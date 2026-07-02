import { SlateTool } from 'slates';
import { z } from 'zod';
import { NpmRegistryClient } from '../lib/client';
import { spec } from '../spec';

export let deprecatePackage = SlateTool.create(spec, {
  name: 'Deprecate Package Version',
  key: 'deprecate_package',
  description: `Mark a specific version of a package as deprecated with a message. Deprecated packages remain available for existing dependents but users are warned to use a newer version. Preferred over unpublishing since it doesn't break existing installations.`,
  instructions: [
    'Provide a clear deprecation message explaining which version to migrate to.',
    'To undeprecate, set the message to an empty string.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      packageName: z
        .string()
        .describe('Full package name (e.g. "my-package" or "@scope/my-package")'),
      version: z.string().describe('Semver version to deprecate (e.g. "1.2.3")'),
      message: z
        .string()
        .describe('Deprecation message shown to users. Use empty string to undeprecate.')
    })
  )
  .output(
    z.object({
      packageName: z.string().describe('Package that was updated'),
      version: z.string().describe('Version that was deprecated'),
      deprecationMessage: z.string().describe('The deprecation message set on the version')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NpmRegistryClient({ token: ctx.auth.token });

    await client.deprecatePackageVersion(
      ctx.input.packageName,
      ctx.input.version,
      ctx.input.message
    );

    let action = ctx.input.message ? 'Deprecated' : 'Undeprecated';
    return {
      output: {
        packageName: ctx.input.packageName,
        version: ctx.input.version,
        deprecationMessage: ctx.input.message
      },
      message: `${action} **${ctx.input.packageName}@${ctx.input.version}**${ctx.input.message ? `: "${ctx.input.message}"` : ''}.`
    };
  })
  .build();
