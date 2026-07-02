import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  buildRelationship,
  cleanAttributes,
  flattenResource,
  mergeRelationships
} from '../lib/helpers';
import { spec } from '../spec';

export let manageSnippet = SlateTool.create(spec, {
  name: 'Manage Snippet',
  key: 'manage_snippet',
  description: `Create or update a reusable text snippet in Outreach.
Snippets are reusable text blocks that can be inserted into emails and templates for consistent messaging.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update']).describe('Action to perform'),
      snippetId: z.string().optional().describe('Snippet ID (required for update)'),
      name: z.string().optional().describe('Snippet name'),
      bodyHtml: z.string().optional().describe('HTML content'),
      bodyText: z.string().optional().describe('Plain text content'),
      shareType: z
        .enum(['private', 'read_only', 'shared'])
        .optional()
        .describe('Sharing level'),
      tags: z.array(z.string()).optional().describe('Tags'),
      ownerId: z.string().optional().describe('Owner user ID')
    })
  )
  .output(
    z.object({
      snippetId: z.string(),
      name: z.string().optional(),
      shareType: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let attributes = cleanAttributes({
      name: ctx.input.name,
      bodyHtml: ctx.input.bodyHtml,
      bodyText: ctx.input.bodyText,
      shareType: ctx.input.shareType,
      tags: ctx.input.tags
    });

    let relationships = mergeRelationships(buildRelationship('owner', ctx.input.ownerId));

    if (ctx.input.action === 'create') {
      let resource = await client.createSnippet(attributes, relationships);
      let flat = flattenResource(resource);
      return {
        output: {
          snippetId: flat.id,
          name: flat.name,
          shareType: flat.shareType,
          createdAt: flat.createdAt,
          updatedAt: flat.updatedAt
        },
        message: `Snippet **${flat.name}** created with ID ${flat.id}.`
      };
    }

    if (!ctx.input.snippetId) throw new Error('snippetId is required for update');
    let resource = await client.updateSnippet(ctx.input.snippetId, attributes);
    let flat = flattenResource(resource);
    return {
      output: {
        snippetId: flat.id,
        name: flat.name,
        shareType: flat.shareType,
        createdAt: flat.createdAt,
        updatedAt: flat.updatedAt
      },
      message: `Snippet **${flat.name}** (${flat.id}) updated successfully.`
    };
  })
  .build();
