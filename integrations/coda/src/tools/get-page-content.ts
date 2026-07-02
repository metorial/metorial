import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { codaServiceError } from '../lib/errors';
import { spec } from '../spec';

let mimeTypeFor = (format: 'html' | 'markdown') =>
  format === 'html' ? 'text/html' : 'text/markdown';

export let listPageContentTool = SlateTool.create(spec, {
  name: 'List Page Content',
  key: 'list_page_content',
  description: `List structured content elements on a Coda page. Use this to inspect element IDs before deleting or replacing page content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      pageIdOrName: z.string().describe('ID or name of the page'),
      limit: z.number().optional().describe('Maximum number of page content elements'),
      pageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .output(
    z.object({
      elements: z.array(
        z.object({
          elementId: z.string().describe('ID of the content element'),
          type: z.string().optional().describe('Type of content element'),
          format: z.string().optional().describe('Format of the element content'),
          content: z.string().optional().describe('Text content when returned by Coda'),
          lineLevel: z.number().optional().describe('Line indentation level when applicable')
        })
      ),
      nextPageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getPageContent(ctx.input.docId, ctx.input.pageIdOrName, {
      limit: ctx.input.limit,
      pageToken: ctx.input.pageToken
    });

    let elements = (result.items || []).map((element: any) => ({
      elementId: element.id,
      type: element.type,
      format: element.itemContent?.format,
      content: element.itemContent?.content,
      lineLevel: element.itemContent?.lineLevel
    }));

    return {
      output: {
        elements,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${elements.length}** content element(s) on page **${ctx.input.pageIdOrName}**.`
    };
  })
  .build();

export let getPageContentTool = SlateTool.create(spec, {
  name: 'Export Page Content',
  key: 'get_page_content',
  description: `Export a Coda page as HTML or Markdown. The exported file content is returned as a Slate text attachment.`,
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
        .describe('Output format for exported page content'),
      maxPollAttempts: z
        .number()
        .optional()
        .default(10)
        .describe('Maximum number of export-status polling attempts'),
      pollIntervalMs: z
        .number()
        .optional()
        .default(1000)
        .describe('Delay between export-status polling attempts in milliseconds')
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('ID of the page'),
      pageName: z.string().describe('Name of the page'),
      exportRequestId: z.string().describe('ID of the Coda export request'),
      status: z.string().describe('Final export status returned by Coda'),
      contentFormat: z.string().describe('Format of the attached content'),
      attachmentCount: z.number().describe('Number of returned attachments'),
      browserLink: z.string().optional().describe('URL to open the page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let page = await client.getPage(ctx.input.docId, ctx.input.pageIdOrName);
    let exportResult = await client.beginPageExport(ctx.input.docId, ctx.input.pageIdOrName, {
      outputFormat: ctx.input.outputFormat
    });

    let exportRequestId = exportResult.id;
    for (let attempt = 0; attempt < ctx.input.maxPollAttempts; attempt++) {
      if (exportResult.status !== 'inProgress' && exportResult.status !== 'pending') {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, ctx.input.pollIntervalMs));
      exportResult = await client.getPageExportStatus(
        ctx.input.docId,
        ctx.input.pageIdOrName,
        exportRequestId
      );
    }

    if (exportResult.status === 'failed') {
      throw codaServiceError(
        `Coda page export failed: ${exportResult.error || 'unknown export error'}`
      );
    }

    if (!exportResult.downloadLink) {
      throw codaServiceError(
        `Coda page export ${exportRequestId} did not complete within ${ctx.input.maxPollAttempts} poll attempt(s).`
      );
    }

    let content = await client.downloadText(exportResult.downloadLink);

    return {
      output: {
        pageId: page.id,
        pageName: page.name,
        exportRequestId,
        status: exportResult.status,
        contentFormat: ctx.input.outputFormat,
        attachmentCount: 1,
        browserLink: page.browserLink
      },
      attachments: [createTextAttachment(content, mimeTypeFor(ctx.input.outputFormat))],
      message: `Exported **${ctx.input.outputFormat}** content for page **${page.name}**.`
    };
  })
  .build();

export let deletePageContentTool = SlateTool.create(spec, {
  name: 'Delete Page Content',
  key: 'delete_page_content',
  description: `Delete specific content elements from a Coda page by ID, or delete all page content when no element IDs are supplied.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      pageIdOrName: z.string().describe('ID or name of the page'),
      elementIds: z
        .array(z.string())
        .optional()
        .describe(
          'IDs of page content elements to delete. Omit or pass an empty array to delete all content.'
        )
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('ID to track the asynchronous content deletion'),
      pageId: z.string().describe('ID of the page whose content deletion was queued'),
      deleted: z.boolean().describe('Whether the delete was successfully queued')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deletePageContent(ctx.input.docId, ctx.input.pageIdOrName, {
      elementIds: ctx.input.elementIds
    });

    return {
      output: {
        requestId: result.requestId,
        pageId: result.id,
        deleted: true
      },
      message: `Queued deletion of page content on **${ctx.input.pageIdOrName}**. Request ID: ${result.requestId}`
    };
  })
  .build();
