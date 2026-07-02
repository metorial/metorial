import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { NotionClient } from '../lib/client';
import { spec } from '../spec';

export let pageUpdates = SlateTrigger.create(spec, {
  name: 'Page Updates',
  key: 'page_updates',
  description:
    '[Polling fallback] Polls for recently updated pages in the workspace. Detects new and modified pages shared with the integration by checking for changes since the last poll.'
})
  .input(
    z.object({
      pageId: z.string().describe('ID of the page'),
      lastEditedTime: z.string().describe('When the page was last edited'),
      objectType: z.string().describe('Object type (page or database)')
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('ID of the updated page'),
      title: z.string().optional().describe('Title of the page'),
      url: z.string().optional().describe('URL of the page'),
      lastEditedTime: z.string().optional().describe('When the page was last edited'),
      createdTime: z.string().optional().describe('When the page was created'),
      archived: z.boolean().optional().describe('Whether the page is archived'),
      properties: z.record(z.string(), z.any()).optional().describe('Page properties'),
      parent: z.any().optional().describe('Parent reference')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new NotionClient({ token: ctx.auth.token });

      let lastPolled = (ctx.state as any)?.lastPolledTime as string | undefined;

      let result = await client.search({
        filter: { property: 'object', value: 'page' },
        sort: { timestamp: 'last_edited_time', direction: 'descending' },
        pageSize: 50
      });

      let inputs: Array<{
        pageId: string;
        lastEditedTime: string;
        objectType: string;
      }> = [];

      for (let item of result.results) {
        if (item.object !== 'page') continue;

        let editedTime = item.last_edited_time;
        if (lastPolled && editedTime && editedTime <= lastPolled) {
          break;
        }

        inputs.push({
          pageId: item.id,
          lastEditedTime: editedTime,
          objectType: item.object
        });
      }

      let newLastPolled =
        result.results.length > 0 && result.results[0]?.last_edited_time
          ? result.results[0].last_edited_time
          : (lastPolled ?? new Date().toISOString());

      return {
        inputs,
        updatedState: {
          lastPolledTime: newLastPolled
        }
      };
    },

    handleEvent: async ctx => {
      let client = new NotionClient({ token: ctx.auth.token });

      let page: any = null;
      try {
        page = await client.getPage(ctx.input.pageId);
      } catch {
        // Page may not be accessible
      }

      let title: string | undefined;
      if (page?.properties) {
        for (let key of Object.keys(page.properties)) {
          let prop = page.properties[key];
          if (prop?.type === 'title' && Array.isArray(prop.title)) {
            title = prop.title.map((t: any) => t.plain_text ?? '').join('');
            break;
          }
        }
      }

      return {
        type: 'page.updated',
        id: `page-${ctx.input.pageId}-${ctx.input.lastEditedTime}`,
        output: {
          pageId: ctx.input.pageId,
          title,
          url: page?.url,
          lastEditedTime: page?.last_edited_time ?? ctx.input.lastEditedTime,
          createdTime: page?.created_time,
          archived: page?.archived,
          properties: page?.properties,
          parent: page?.parent
        }
      };
    }
  })
  .build();
