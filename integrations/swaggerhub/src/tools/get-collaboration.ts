import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let collaboratorSchema = z
  .object({
    name: z.string().optional().describe('Collaborator username'),
    role: z.string().optional().describe('Role (VIEWER, EDITOR, etc.)'),
    startDate: z.string().optional().describe('When the collaboration started')
  })
  .passthrough();

export let getCollaboration = SlateTool.create(spec, {
  name: 'Get API Collaborators',
  key: 'get_collaboration',
  description: `Retrieve the collaboration settings and list of collaborators for an API in SwaggerHub. Shows who has access to the API and their roles.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z
        .string()
        .optional()
        .describe('API owner (username or organization). Falls back to config owner.'),
      apiName: z.string().describe('Name of the API')
    })
  )
  .output(
    z.object({
      owner: z.string().describe('API owner'),
      collaborators: z.array(collaboratorSchema).describe('List of collaborators')
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

    let result = await client.getApiCollaboration(owner, ctx.input.apiName);
    let collaborators = result?.members ?? result?.collaborators ?? [];

    return {
      output: {
        owner,
        collaborators: Array.isArray(collaborators) ? collaborators : []
      },
      message: `Found **${Array.isArray(collaborators) ? collaborators.length : 0}** collaborator(s) on API **${owner}/${ctx.input.apiName}**.`
    };
  })
  .build();
