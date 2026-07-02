import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageKeywords = SlateTool.create(spec, {
  name: 'Manage Keywords',
  key: 'manage_keywords',
  description: `Add new keywords to track or delete existing keywords from a project. When adding, configure the domain, search region, language, device type, and tags for each keyword. Use this for bulk keyword management within a project.`,
  instructions: [
    'When adding keywords, each keyword needs at minimum a keyword text and a URL (domain) to track.',
    'Region defaults to "google.com" and language to "en" if not specified.',
    'Device defaults to "desktop" if not specified.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'delete']).describe('Action to perform'),
      projectName: z.string().describe('Name of the project'),
      keywords: z
        .array(
          z.object({
            keyword: z.string().describe('Keyword text to track (max 150 chars)'),
            url: z.string().describe('Domain or URL to track rankings for'),
            region: z
              .string()
              .optional()
              .describe('Google search region (e.g., "google.com", "google.co.uk")'),
            language: z.string().optional().describe('Language code (e.g., "en", "fr", "de")'),
            tags: z.array(z.string()).optional().describe('Tags to assign to the keyword'),
            device: z.enum(['desktop', 'mobile']).optional().describe('Device type to track'),
            ignoreLocalPack: z
              .boolean()
              .optional()
              .describe('Whether to ignore local pack results'),
            urlTrackingMethod: z
              .string()
              .optional()
              .describe('URL tracking method (e.g., "exact", "domain")'),
            ignoreSubDomains: z
              .boolean()
              .optional()
              .describe('Whether to ignore subdomains in matching')
          })
        )
        .optional()
        .describe('Keywords to add (required for "add" action)'),
      keywordId: z
        .string()
        .optional()
        .describe('Keyword ID to delete (required for "delete" action)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      addedCount: z.number().nullable().describe('Number of keywords added'),
      rawResponse: z.any().optional().describe('Raw API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, projectName } = ctx.input;

    if (action === 'add') {
      if (!ctx.input.keywords || ctx.input.keywords.length === 0) {
        throw new Error('Keywords array is required for the "add" action');
      }

      let result = await client.addKeywords({
        projectName,
        keywords: ctx.input.keywords
      });

      let addedCount = Array.isArray(result)
        ? result.length
        : (result?.keywords?.length ?? ctx.input.keywords.length);

      return {
        output: {
          success: true,
          addedCount,
          rawResponse: result
        },
        message: `Added **${addedCount}** keyword(s) to project **${projectName}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.keywordId) {
        throw new Error('keywordId is required for the "delete" action');
      }

      let result = await client.deleteKeyword({
        projectName,
        keywordId: ctx.input.keywordId
      });

      return {
        output: {
          success: true,
          addedCount: null,
          rawResponse: result
        },
        message: `Deleted keyword **${ctx.input.keywordId}** from project **${projectName}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
