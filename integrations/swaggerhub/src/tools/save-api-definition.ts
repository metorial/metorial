import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let saveApiDefinition = SlateTool.create(spec, {
  name: 'Save API Definition',
  key: 'save_api_definition',
  description: `Create or update an API definition in SwaggerHub. Provide the full OpenAPI or AsyncAPI specification in YAML format. Optionally set the version, visibility, and OAS version.`,
  instructions: [
    'The definition must be a valid OpenAPI (2.0 / 3.x) or AsyncAPI spec in YAML format.',
    'If the API already exists, the definition will be updated. Use force=true to overwrite even if the version exists.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z
        .string()
        .optional()
        .describe('API owner (username or organization). Falls back to config owner.'),
      apiName: z.string().describe('Name of the API'),
      definition: z.string().describe('The API definition in YAML format'),
      version: z.string().optional().describe('Version to assign to the definition'),
      isPrivate: z.boolean().optional().describe('Whether the API should be private'),
      oas: z.string().optional().describe('OAS version (e.g., "2.0", "3.0.0")'),
      force: z
        .boolean()
        .optional()
        .describe('Overwrite the definition even if the version already exists')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      owner: z.string().describe('API owner'),
      apiName: z.string().describe('API name')
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

    await client.saveApiDefinition(owner, ctx.input.apiName, {
      definition: ctx.input.definition,
      version: ctx.input.version,
      isPrivate: ctx.input.isPrivate,
      oas: ctx.input.oas,
      force: ctx.input.force
    });

    return {
      output: {
        success: true,
        owner,
        apiName: ctx.input.apiName
      },
      message: `Successfully saved API definition for **${owner}/${ctx.input.apiName}**${ctx.input.version ? ` version **${ctx.input.version}**` : ''}.`
    };
  })
  .build();
