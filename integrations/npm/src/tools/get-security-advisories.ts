import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { NpmRegistryClient } from '../lib/client';
import { array, record } from '../lib/response';
import { spec } from '../spec';

export let getSecurityAdvisories = SlateTool.create(spec, {
  name: 'Get Security Advisories',
  key: 'get_security_advisories',
  description:
    'Check package versions against npm security advisories. Returns vulnerable version ranges, severity, advisory URLs, and the other advisory fields supplied by npm.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      packages: z
        .record(z.string(), z.array(z.string()))
        .describe(
          'Package names mapped to the versions to check, for example {"lodash":["4.17.20"]}.'
        )
    })
  )
  .output(
    z.object({
      advisories: z
        .record(z.string(), z.array(z.record(z.string(), z.unknown())))
        .describe(
          'Advisories grouped by package. Packages without advisories are omitted by npm.'
        )
    })
  )
  .handleInvocation(async ctx => {
    if (
      Object.keys(ctx.input.packages).length === 0 ||
      Object.entries(ctx.input.packages).some(
        ([name, versions]) =>
          !name || versions.length === 0 || versions.some(version => !version)
      )
    ) {
      throw createApiServiceError(
        'Provide at least one package with one or more non-empty versions to check.'
      );
    }
    let client = new NpmRegistryClient({ token: ctx.auth.token });
    let result = record(
      await client.getSecurityAdvisories(ctx.input.packages),
      'security advisory response'
    );
    let advisories = Object.fromEntries(
      Object.entries(result).map(([name, entries]) => [
        name,
        array(entries, 'security advisories').map(entry => record(entry, 'security advisory'))
      ])
    );
    return {
      output: { advisories },
      message: `Checked **${Object.keys(ctx.input.packages).length}** package(s); **${Object.keys(advisories).length}** package(s) have advisories.`
    };
  })
  .build();
