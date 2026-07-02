import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let saveDomainDefinition = SlateTool.create(spec, {
  name: 'Save Domain Definition',
  key: 'save_domain_definition',
  description: `Create or update a domain definition in SwaggerHub. Domains are reusable components (models, parameters, responses) that can be shared across multiple API definitions. Provide the definition in YAML format.`,
  instructions: [
    'The definition must be a valid domain spec in YAML format.',
    'Use force=true to overwrite an existing version.'
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
        .describe('Domain owner (username or organization). Falls back to config owner.'),
      domainName: z.string().describe('Name of the domain'),
      definition: z.string().describe('The domain definition in YAML format'),
      version: z.string().optional().describe('Version to assign'),
      isPrivate: z.boolean().optional().describe('Whether the domain should be private'),
      force: z.boolean().optional().describe('Overwrite even if the version exists')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      owner: z.string().describe('Domain owner'),
      domainName: z.string().describe('Domain name')
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

    await client.saveDomainDefinition(owner, ctx.input.domainName, {
      definition: ctx.input.definition,
      version: ctx.input.version,
      isPrivate: ctx.input.isPrivate,
      force: ctx.input.force
    });

    return {
      output: {
        success: true,
        owner,
        domainName: ctx.input.domainName
      },
      message: `Successfully saved domain definition for **${owner}/${ctx.input.domainName}**${ctx.input.version ? ` version **${ctx.input.version}**` : ''}.`
    };
  })
  .build();
