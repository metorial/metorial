import { SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { spec } from '../spec';

let wikiPageOutputSchema = z.object({
  title: z.string().describe('Page title'),
  subUrl: z.string().describe('URL-safe page identifier'),
  htmlUrl: z.string().describe('Web URL of the wiki page'),
  contentBase64: z
    .string()
    .optional()
    .describe('Base64-encoded page content (only when fetching a single page)'),
  lastCommitSha: z.string().optional().describe('SHA of the last commit'),
  lastCommitMessage: z.string().optional().describe('Message of the last commit')
});

export let listWikiPages = SlateTool.create(spec, {
  name: 'List Wiki Pages',
  key: 'list_wiki_pages',
  description: `List all wiki pages in a repository. Returns page titles and URLs without content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      wikiPages: z.array(wikiPageOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let pages = await client.listWikiPages(ctx.input.owner, ctx.input.repo, {
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    return {
      output: {
        wikiPages: pages.map(p => ({
          title: p.title,
          subUrl: p.sub_url,
          htmlUrl: p.html_url,
          lastCommitSha: p.last_commit?.sha,
          lastCommitMessage: p.last_commit?.message
        }))
      },
      message: `Found **${pages.length}** wiki pages in **${ctx.input.owner}/${ctx.input.repo}**`
    };
  })
  .build();

export let getWikiPage = SlateTool.create(spec, {
  name: 'Get Wiki Page',
  key: 'get_wiki_page',
  description: `Retrieve a specific wiki page's content and metadata. Content is returned base64-encoded.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      pageName: z.string().describe('Wiki page name/title')
    })
  )
  .output(wikiPageOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let p = await client.getWikiPage(ctx.input.owner, ctx.input.repo, ctx.input.pageName);

    return {
      output: {
        title: p.title,
        subUrl: p.sub_url,
        htmlUrl: p.html_url,
        contentBase64: p.content_base64,
        lastCommitSha: p.last_commit?.sha,
        lastCommitMessage: p.last_commit?.message
      },
      message: `Retrieved wiki page **${p.title}**`
    };
  })
  .build();

export let createWikiPage = SlateTool.create(spec, {
  name: 'Create Wiki Page',
  key: 'create_wiki_page',
  description: `Create a new wiki page in a repository. Content must be base64-encoded.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      title: z.string().describe('Wiki page title'),
      contentBase64: z.string().describe('Base64-encoded page content (Markdown)'),
      commitMessage: z.string().optional().describe('Custom commit message')
    })
  )
  .output(wikiPageOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let p = await client.createWikiPage(ctx.input.owner, ctx.input.repo, {
      title: ctx.input.title,
      contentBase64: ctx.input.contentBase64,
      message: ctx.input.commitMessage
    });

    return {
      output: {
        title: p.title,
        subUrl: p.sub_url,
        htmlUrl: p.html_url,
        contentBase64: p.content_base64,
        lastCommitSha: p.last_commit?.sha,
        lastCommitMessage: p.last_commit?.message
      },
      message: `Created wiki page **${p.title}**`
    };
  })
  .build();

export let updateWikiPage = SlateTool.create(spec, {
  name: 'Update Wiki Page',
  key: 'update_wiki_page',
  description: `Update an existing wiki page's content or title. Content must be base64-encoded.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      pageName: z.string().describe('Current wiki page name'),
      title: z.string().optional().describe('New page title'),
      contentBase64: z.string().optional().describe('New base64-encoded content'),
      commitMessage: z.string().optional().describe('Custom commit message')
    })
  )
  .output(wikiPageOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let p = await client.updateWikiPage(ctx.input.owner, ctx.input.repo, ctx.input.pageName, {
      title: ctx.input.title,
      contentBase64: ctx.input.contentBase64,
      message: ctx.input.commitMessage
    });

    return {
      output: {
        title: p.title,
        subUrl: p.sub_url,
        htmlUrl: p.html_url,
        contentBase64: p.content_base64,
        lastCommitSha: p.last_commit?.sha,
        lastCommitMessage: p.last_commit?.message
      },
      message: `Updated wiki page **${p.title}**`
    };
  })
  .build();

export let deleteWikiPage = SlateTool.create(spec, {
  name: 'Delete Wiki Page',
  key: 'delete_wiki_page',
  description: `Delete a wiki page from a repository.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      pageName: z.string().describe('Wiki page name to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the wiki page was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    await client.deleteWikiPage(ctx.input.owner, ctx.input.repo, ctx.input.pageName);

    return {
      output: { deleted: true },
      message: `Deleted wiki page **${ctx.input.pageName}**`
    };
  })
  .build();
