import { SlateTool } from 'slates';
import { z } from 'zod';
import { SOURCE_LIST } from '../lib/sources';
import { spec } from '../spec';

export let listSources = SlateTool.create(spec, {
  name: 'List Sources',
  key: 'list_sources',
  description:
    'List the NYU Stern financial data sources supported by this integration, including fields and filter hints.',
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      sources: z
        .array(
          z.object({
            id: z.string().describe('Source id to pass to get_source.'),
            title: z.string().describe('Human-readable source title.'),
            description: z.string().describe('Source contents.'),
            pageUrl: z.string().describe('Stern HTML page URL.'),
            workbookUrl: z.string().describe('Stern workbook URL.'),
            rowFields: z.array(z.string()).describe('Fields returned for source rows.'),
            supportedFilters: z
              .array(z.string())
              .describe('Filter inputs supported by get_source.')
          })
        )
        .describe('Supported Stern financial data sources.')
    })
  )
  .handleInvocation(async () => ({
    output: {
      sources: SOURCE_LIST.map(source => ({
        id: source.id,
        title: source.title,
        description: source.description,
        pageUrl: source.pageUrl,
        workbookUrl: source.workbookUrl,
        rowFields: [...source.rowFields],
        supportedFilters: [...source.supportedFilters]
      }))
    },
    message: `Found **${SOURCE_LIST.length}** Stern financial data sources.`
  }))
  .build();
