import { SlateTool } from 'slates';
import { z } from 'zod';
import { AzureDevOpsClient } from '../lib/client';
import { spec } from '../spec';

export let manageWikiTool = SlateTool.create(spec, {
  name: 'Manage Wiki',
  key: 'manage_wiki',
  description: `List wikis, read wiki pages, and create or update wiki page content. Supports both project wikis and code-backed wikis.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      project: z
        .string()
        .optional()
        .describe('Project name or ID. Uses default project from config if not provided.'),
      action: z
        .enum(['list_wikis', 'get_page', 'create_or_update_page'])
        .describe('Action to perform'),
      wikiIdentifier: z
        .string()
        .optional()
        .describe('Wiki name or ID (required for get_page and create_or_update_page)'),
      pagePath: z
        .string()
        .optional()
        .describe(
          'Wiki page path (e.g. "/Home" or "/Architecture/Overview"). Required for get_page and create_or_update_page.'
        ),
      pageContent: z
        .string()
        .optional()
        .describe('Markdown content for the page (required for create_or_update_page)'),
      eTag: z
        .string()
        .optional()
        .describe(
          'ETag / version for optimistic concurrency on updates. Required when updating an existing page.'
        )
    })
  )
  .output(
    z.object({
      wikis: z
        .array(
          z.object({
            wikiId: z.string(),
            wikiName: z.string(),
            wikiType: z.string().optional(),
            url: z.string().optional()
          })
        )
        .optional(),
      page: z
        .object({
          pageId: z.number().optional(),
          pagePath: z.string().optional(),
          content: z.string().optional(),
          gitItemPath: z.string().optional(),
          eTag: z.string().optional(),
          subPages: z
            .array(
              z.object({
                pageId: z.number().optional(),
                pagePath: z.string().optional()
              })
            )
            .optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AzureDevOpsClient({
      token: ctx.auth.token,
      organization: ctx.config.organization
    });
    let project = ctx.input.project || ctx.config.project;
    if (!project) throw new Error('Project is required.');

    if (ctx.input.action === 'list_wikis') {
      let result = await client.listWikis(project);
      let wikis = (result.value || []).map((w: any) => ({
        wikiId: w.id,
        wikiName: w.name,
        wikiType: w.type,
        url: w.url
      }));
      return {
        output: { wikis },
        message: `Found **${wikis.length}** wikis.`
      };
    }

    if (ctx.input.action === 'get_page') {
      if (!ctx.input.wikiIdentifier || !ctx.input.pagePath) {
        throw new Error('wikiIdentifier and pagePath are required for "get_page"');
      }
      let page = await client.getWikiPage(
        project,
        ctx.input.wikiIdentifier,
        ctx.input.pagePath,
        {
          includeContent: true,
          recursionLevel: 'oneLevel'
        }
      );
      return {
        output: {
          page: {
            pageId: page.page?.id,
            pagePath: page.page?.path,
            content: page.page?.content,
            gitItemPath: page.page?.gitItemPath,
            eTag: page.eTag,
            subPages: (page.page?.subPages || []).map((sp: any) => ({
              pageId: sp.id,
              pagePath: sp.path
            }))
          }
        },
        message: `Retrieved wiki page "${ctx.input.pagePath}"`
      };
    }

    if (ctx.input.action === 'create_or_update_page') {
      if (
        !ctx.input.wikiIdentifier ||
        !ctx.input.pagePath ||
        ctx.input.pageContent === undefined
      ) {
        throw new Error(
          'wikiIdentifier, pagePath, and pageContent are required for "create_or_update_page"'
        );
      }
      let result = await client.createOrUpdateWikiPage(
        project,
        ctx.input.wikiIdentifier,
        ctx.input.pagePath,
        ctx.input.pageContent,
        ctx.input.eTag
      );
      return {
        output: {
          page: {
            pageId: result.page?.id,
            pagePath: result.page?.path,
            content: result.page?.content,
            gitItemPath: result.page?.gitItemPath,
            eTag: result.eTag
          }
        },
        message: `Saved wiki page "${ctx.input.pagePath}"`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
