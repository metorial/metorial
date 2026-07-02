import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDomainDefinition = SlateTool.create(spec, {
  name: 'Get Domain Definition',
  key: 'get_domain_definition',
  description: `Retrieve a domain definition from SwaggerHub. Domains contain reusable components (models, parameters, responses) shared across APIs. Returns the definition for a specific version, or lists available versions if no version is specified.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z
        .string()
        .optional()
        .describe('Domain owner (username or organization). Falls back to config owner.'),
      domainName: z.string().describe('Name of the domain'),
      version: z
        .string()
        .optional()
        .describe('Domain version to retrieve. If omitted, returns available versions.'),
      format: z
        .enum(['json', 'yaml'])
        .optional()
        .default('json')
        .describe('Response format for the definition')
    })
  )
  .output(
    z.object({
      owner: z.string().describe('Domain owner'),
      domainName: z.string().describe('Domain name'),
      version: z.string().optional().describe('Retrieved version'),
      versions: z
        .array(z.string())
        .optional()
        .describe('Available versions (when no version specified)'),
      definition: z.any().optional().describe('The domain definition')
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

    let domainName = ctx.input.domainName;

    if (!ctx.input.version) {
      let versionsResult = await client.getDomainVersions(owner, domainName);
      let versions =
        versionsResult?.apis
          ?.map((a: { properties: Array<{ type: string; value?: string }> }) => {
            let versionProp = a.properties?.find(
              (p: { type: string }) => p.type === 'X-Version'
            );
            return versionProp?.value;
          })
          .filter(Boolean) ?? [];

      return {
        output: {
          owner,
          domainName,
          versions
        },
        message: `Domain **${owner}/${domainName}** has **${versions.length}** version(s): ${versions.join(', ')}`
      };
    }

    let definition: unknown;
    if (ctx.input.format === 'yaml') {
      definition = await client.getDomainDefinitionYaml(owner, domainName, ctx.input.version);
    } else {
      definition = await client.getDomainDefinition(owner, domainName, ctx.input.version);
    }

    return {
      output: {
        owner,
        domainName,
        version: ctx.input.version,
        definition
      },
      message: `Retrieved domain definition for **${owner}/${domainName}** version **${ctx.input.version}** in ${ctx.input.format} format.`
    };
  })
  .build();
