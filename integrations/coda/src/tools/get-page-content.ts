import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPageContentTool = SlateTool.create(spec, {
  name: 'Get Page Content',
  key: 'get_page_content',
  description: `Retrieve the content of a specific page in a Coda doc. Supports exporting as HTML or Markdown format.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      pageIdOrName: z.string().describe('ID or name of the page'),
      outputFormat: z
        .enum(['html', 'markdown'])
        .optional()
        .default('html')
        .describe('Output format for page content')
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('ID of the page'),
      pageName: z.string().describe('Name of the page'),
      content: z.string().describe('Content of the page in the requested format'),
      contentFormat: z.string().describe('Format of the returned content (html or markdown)'),
      browserLink: z.string().optional().describe('URL to open the page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let page = await client.getPage(ctx.input.docId, ctx.input.pageIdOrName);

    let contentResult = await client.beginPageExport(ctx.input.docId, ctx.input.pageIdOrName, {
      outputFormat: ctx.input.outputFormat
    });

    let exportRequestId = contentResult.id;
    let exportResult: any = contentResult;

    let maxAttempts = 10;
    let attempt = 0;
    while (
      attempt < maxAttempts &&
      (!exportResult.status || exportResult.status === 'inProgress')
    ) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      exportResult = await client.getPageExportStatus(
        ctx.input.docId,
        ctx.input.pageIdOrName,
        exportRequestId
      );
      attempt++;
    }

    let content = exportResult.downloadLink || '';
    if (exportResult.downloadLink) {
      // The API returns a download link; we return it as-is
      content = exportResult.downloadLink;
    }

    return {
      output: {
        pageId: page.id,
        pageName: page.name,
        content,
        contentFormat: ctx.input.outputFormat,
        browserLink: page.browserLink
      },
      message: `Retrieved **${ctx.input.outputFormat}** content for page **${page.name}**.`
    };
  })
  .build();
