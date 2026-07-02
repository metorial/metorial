import { SlateTool } from 'slates';
import { z } from 'zod';
import { OwlClient } from '../lib/client';
import { spec } from '../spec';

let templateMetadataSchema = z.object({
  name: z.string().optional().describe('Template name for the token'),
  description: z.string().optional().describe('Template description for the token'),
  image: z.string().optional().describe('Template image URL for the token'),
  attributes: z
    .array(
      z.object({
        trait_type: z.string().describe('Attribute name'),
        value: z.string().describe('Attribute value')
      })
    )
    .optional()
    .describe('Default attributes for tokens using this template')
});

let templateOutputSchema = z.object({
  templateId: z.string().describe('Template ID'),
  contractAddress: z.string().optional().describe('Associated collection contract address'),
  metadata: z.record(z.string(), z.unknown()).optional().describe('Template metadata')
});

export let createTokenTemplate = SlateTool.create(spec, {
  name: 'Create Token Template',
  key: 'create_token_template',
  description: `Create a reusable token template that defines default metadata for tokens within a collection.
Templates simplify batch minting by providing predefined metadata (name, description, image, attributes) so you don't need to specify it for each mint.`,
  instructions: [
    'Optionally bind the template to a specific collection by providing a contractAddress.',
    'The returned templateId can be used when minting tokens.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contractAddress: z
        .string()
        .optional()
        .describe('Contract address to bind this template to a specific collection'),
      metadata: templateMetadataSchema.describe(
        'Default metadata for tokens created with this template'
      )
    })
  )
  .output(templateOutputSchema)
  .handleInvocation(async ctx => {
    let client = new OwlClient({ token: ctx.auth.token });

    ctx.info({
      message: 'Creating token template',
      contractAddress: ctx.input.contractAddress
    });

    let result = await client.createTokenTemplate({
      contractAddress: ctx.input.contractAddress,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        templateId: result.id,
        contractAddress: result.address,
        metadata: result.metadata
      },
      message: `Created token template \`${result.id}\`${ctx.input.contractAddress ? ` for collection \`${ctx.input.contractAddress}\`` : ''}.`
    };
  })
  .build();

export let getTokenTemplate = SlateTool.create(spec, {
  name: 'Get Token Template',
  key: 'get_token_template',
  description: `Retrieve a specific token template by its ID, including its metadata configuration.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the token template to retrieve')
    })
  )
  .output(templateOutputSchema)
  .handleInvocation(async ctx => {
    let client = new OwlClient({ token: ctx.auth.token });

    let result = await client.getTokenTemplate({
      templateId: ctx.input.templateId
    });

    return {
      output: {
        templateId: result.id,
        contractAddress: result.address,
        metadata: result.metadata
      },
      message: `Retrieved token template \`${result.id}\`.`
    };
  })
  .build();

export let listTokenTemplates = SlateTool.create(spec, {
  name: 'List Token Templates',
  key: 'list_token_templates',
  description: `List all token templates in the project. Returns template IDs and metadata for each template.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Template ID'),
            contractAddress: z
              .string()
              .optional()
              .describe('Associated collection contract address'),
            metadata: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Template metadata')
          })
        )
        .describe('List of token templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OwlClient({ token: ctx.auth.token });

    let result = await client.listTokenTemplates();
    let templates = Array.isArray(result) ? result : (result.items ?? []);

    let mapped = templates.map(
      (t: { id: string; address?: string; metadata?: Record<string, unknown> }) => ({
        templateId: t.id,
        contractAddress: t.address,
        metadata: t.metadata
      })
    );

    return {
      output: { templates: mapped },
      message: `Found **${mapped.length}** token template(s).`
    };
  })
  .build();

export let updateTokenTemplate = SlateTool.create(spec, {
  name: 'Update Token Template',
  key: 'update_token_template',
  description: `Update an existing token template's metadata. Modifies specified fields while keeping other fields intact.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the token template to update'),
      metadata: templateMetadataSchema.describe('Metadata fields to update')
    })
  )
  .output(templateOutputSchema)
  .handleInvocation(async ctx => {
    let client = new OwlClient({ token: ctx.auth.token });

    ctx.info({ message: 'Updating token template', templateId: ctx.input.templateId });

    let result = await client.patchTokenTemplate({
      templateId: ctx.input.templateId,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        templateId: result.id,
        contractAddress: result.address,
        metadata: result.metadata
      },
      message: `Updated token template \`${result.id}\`.`
    };
  })
  .build();
