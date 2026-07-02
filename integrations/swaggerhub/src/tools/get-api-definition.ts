import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getApiDefinition = SlateTool.create(spec, {
  name: 'Get API Definition',
  key: 'get_api_definition',
  description: `Retrieve an API definition from SwaggerHub. Returns the full OpenAPI or AsyncAPI specification for a given API version, along with its settings (published status, visibility, default version). Use this to inspect or download API specs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z
        .string()
        .optional()
        .describe(
          'API owner (username or organization). Falls back to config owner if not provided.'
        ),
      apiName: z.string().describe('Name of the API'),
      version: z
        .string()
        .optional()
        .describe('API version to retrieve. If omitted, returns available versions.'),
      format: z
        .enum(['json', 'yaml'])
        .optional()
        .default('json')
        .describe('Response format for the definition'),
      resolved: z.boolean().optional().describe('Whether to resolve external $refs'),
      flatten: z.boolean().optional().describe('Whether to flatten inline schemas into models')
    })
  )
  .output(
    z.object({
      owner: z.string().describe('API owner'),
      apiName: z.string().describe('API name'),
      version: z.string().optional().describe('Retrieved version'),
      versions: z
        .array(z.string())
        .optional()
        .describe('Available versions (when no version specified)'),
      definition: z
        .any()
        .optional()
        .describe('The API definition (JSON object or YAML string)'),
      defaultVersion: z.string().optional().describe('Default version of the API')
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

    let apiName = ctx.input.apiName;

    if (!ctx.input.version) {
      let versionsResult = await client.getApiVersions(owner, apiName);
      let versions =
        versionsResult?.apis
          ?.map((a: { properties: Array<{ type: string; value?: string }> }) => {
            let versionProp = a.properties?.find(
              (p: { type: string }) => p.type === 'X-Version'
            );
            return versionProp?.value;
          })
          .filter(Boolean) ?? [];

      let defaultVersion: string | undefined;
      try {
        let defaultResult = await client.getApiDefaultVersion(owner, apiName);
        defaultVersion = defaultResult?.version;
      } catch {
        // default version endpoint may not be accessible
      }

      return {
        output: {
          owner,
          apiName,
          versions,
          defaultVersion
        },
        message: `API **${owner}/${apiName}** has **${versions.length}** version(s): ${versions.join(', ')}${defaultVersion ? `. Default: ${defaultVersion}` : ''}`
      };
    }

    let definition: unknown;
    if (ctx.input.format === 'yaml') {
      definition = await client.getApiDefinitionYaml(owner, apiName, ctx.input.version);
    } else {
      definition = await client.getApiDefinition(owner, apiName, ctx.input.version, {
        resolved: ctx.input.resolved,
        flatten: ctx.input.flatten
      });
    }

    let defaultVersion: string | undefined;
    try {
      let defaultResult = await client.getApiDefaultVersion(owner, apiName);
      defaultVersion = defaultResult?.version;
    } catch {
      // ignore
    }

    return {
      output: {
        owner,
        apiName,
        version: ctx.input.version,
        definition,
        defaultVersion
      },
      message: `Retrieved API definition for **${owner}/${apiName}** version **${ctx.input.version}** in ${ctx.input.format} format.`
    };
  })
  .build();
