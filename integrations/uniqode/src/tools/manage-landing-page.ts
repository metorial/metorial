import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { spec } from '../spec';

export let manageLandingPage = SlateTool.create(spec, {
  name: 'Manage Landing Page',
  key: 'manage_landing_page',
  description: `Create, update, or list landing pages (Markdown Cards) used in campaigns. Landing pages are mobile-friendly pages that can be linked to QR codes, beacons, NFC tags, or geofences.
Use **action "list"** to browse existing pages, **"create"** to make a new one, or **"update"** to modify content.`,
  instructions: [
    'For "create", title is required.',
    'For "update", provide landingPageId and the fields you want to change.',
    'For "list", all parameters are optional filters.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      organizationId: z
        .number()
        .optional()
        .describe('Organization ID from list_organizations; overrides the configured default'),
      action: z.enum(['list', 'create', 'update']).describe('Action to perform'),
      landingPageId: z.number().optional().describe('Landing page ID (required for update)'),
      title: z.string().optional().describe('Title for the landing page'),
      description: z.string().optional().describe('Description/subtitle'),
      body: z.string().optional().describe('HTML/Markdown body content'),
      languageCode: z.string().optional().describe('Language code (e.g. "en")'),
      search: z.string().optional().describe('Search query (for list action)'),
      limit: z.number().optional().describe('Maximum results (for list action)'),
      offset: z.number().optional().describe('Pagination offset (for list action)')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete provider response'),
      landingPages: z
        .array(
          z.object({
            landingPageId: z.number().describe('Landing page ID'),
            title: z.string().optional().describe('Title'),
            description: z.string().optional().describe('Description'),
            organizationId: z.number().optional().describe('Organization ID'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .optional()
        .describe('List of landing pages (for list action)'),
      totalCount: z.number().optional().describe('Total count (for list action)'),
      landingPage: z
        .object({
          landingPageId: z.number().describe('Landing page ID'),
          title: z.string().optional().describe('Title'),
          description: z.string().optional().describe('Description'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          updatedAt: z.string().optional().describe('Last update timestamp')
        })
        .optional()
        .describe('Created or updated landing page')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.action === 'create' && !ctx.input.title) {
      throw createApiServiceError('Provide a title to create a landing page.');
    }
    if (ctx.input.action === 'update' && ctx.input.landingPageId === undefined) {
      throw createApiServiceError(
        'Provide landingPageId from the list action to update a landing page.'
      );
    }
    let client = new BeaconstacClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    if (ctx.input.action === 'list') {
      let result = await client.listMarkdownCards({
        search: ctx.input.search,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });

      let landingPages = result.results.map(card => ({
        landingPageId: card.id,
        title: typeof card.title === 'string' ? card.title : undefined,
        description: typeof card.description === 'string' ? card.description : undefined,
        organizationId: typeof card.organization === 'number' ? card.organization : undefined,
        createdAt: typeof card.created === 'string' ? card.created : undefined,
        updatedAt: typeof card.updated === 'string' ? card.updated : undefined
      }));

      return {
        output: {
          raw: result,
          totalCount: result.count,
          landingPages
        },
        message: `Found **${result.count}** landing page(s). Showing ${landingPages.length} result(s).`
      };
    }

    if (ctx.input.action === 'create') {
      let orgId =
        ctx.input.organizationId ??
        (ctx.config.organizationId ? Number(ctx.config.organizationId) : undefined);

      let result = await client.createMarkdownCard({
        title: ctx.input.title!,
        description: ctx.input.description,
        body: ctx.input.body,
        language_code: ctx.input.languageCode,
        organization: orgId
      });

      return {
        output: {
          raw: result,
          landingPage: {
            landingPageId: result.id,
            title: typeof result.title === 'string' ? result.title : undefined,
            description:
              typeof result.description === 'string' ? result.description : undefined,
            createdAt: typeof result.created === 'string' ? result.created : undefined,
            updatedAt: typeof result.updated === 'string' ? result.updated : undefined
          }
        },
        message: `Created landing page with ID ${result.id}.`
      };
    }

    // update
    let data: Record<string, unknown> = {};
    if (ctx.input.title !== undefined) data.title = ctx.input.title;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.body !== undefined) data.body = ctx.input.body;
    if (ctx.input.languageCode !== undefined) data.language_code = ctx.input.languageCode;

    let result = await client.updateMarkdownCard(ctx.input.landingPageId!, data);

    return {
      output: {
        raw: result,
        landingPage: {
          landingPageId: result.id,
          title: typeof result.title === 'string' ? result.title : undefined,
          description: typeof result.description === 'string' ? result.description : undefined,
          createdAt: typeof result.created === 'string' ? result.created : undefined,
          updatedAt: typeof result.updated === 'string' ? result.updated : undefined
        }
      },
      message: `Updated landing page with ID ${result.id}.`
    };
  })
  .build();
