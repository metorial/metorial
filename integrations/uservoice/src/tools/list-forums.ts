import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let forumSchema = z.object({
  forumId: z.number().describe('Unique ID of the forum'),
  name: z.string().describe('Name of the forum'),
  welcomeMessage: z.string().nullable().describe('Welcome message displayed to users'),
  prompt: z.string().nullable().describe('Prompt text for idea submission'),
  isPublic: z.boolean().describe('Whether the forum is publicly accessible'),
  isPrivate: z.boolean().describe('Whether the forum is private'),
  suggestionsCount: z.number().describe('Total number of suggestions'),
  openSuggestionsCount: z.number().describe('Number of open suggestions'),
  portalUrl: z.string().nullable().describe('Public URL of the forum'),
  createdAt: z.string().describe('When the forum was created'),
  updatedAt: z.string().describe('When the forum was last updated')
});

export let listForums = SlateTool.create(spec, {
  name: 'List Forums',
  key: 'list_forums',
  description: `List all feedback forums in your UserVoice account. Forums are distinct areas for collecting ideas on different topics or products. Useful for discovering forum IDs needed by other tools.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 20, max: 100)')
    })
  )
  .output(
    z.object({
      forums: z.array(forumSchema),
      totalRecords: z.number().describe('Total number of forums'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    let result = await client.listForums({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let forums = result.forums.map((f: any) => ({
      forumId: f.id,
      name: f.name,
      welcomeMessage: f.welcome_message || null,
      prompt: f.prompt || null,
      isPublic: f.is_public ?? true,
      isPrivate: f.is_private ?? false,
      suggestionsCount: f.suggestions_count || 0,
      openSuggestionsCount: f.open_suggestions_count || 0,
      portalUrl: f.portal_url || null,
      createdAt: f.created_at,
      updatedAt: f.updated_at
    }));

    return {
      output: {
        forums,
        totalRecords: result.pagination?.totalRecords || 0,
        totalPages: result.pagination?.totalPages || 0
      },
      message: `Found **${forums.length}** forums.`
    };
  })
  .build();
