import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let documentGenerated = SlateTrigger.create(spec, {
  name: 'Document Generated',
  key: 'document_generated',
  description:
    'Triggers when a new document is generated from a template (merge history entry is created).'
})
  .input(
    z.object({
      historyId: z.number().describe('Merge history entry ID'),
      templateId: z.number().describe('Template ID used for generation'),
      templateTitle: z.string().optional().describe('Template title'),
      status: z.string().describe('Generation status'),
      createdTime: z.string().describe('When the document was generated'),
      fileUrl: z.string().optional().describe('Download URL for the generated document'),
      fileName: z.string().optional().describe('Generated file name')
    })
  )
  .output(
    z.object({
      historyId: z.number().describe('Merge history entry ID'),
      templateId: z.number().describe('Template ID used for generation'),
      templateTitle: z.string().optional().describe('Template title'),
      status: z.string().describe('Generation status (success, error, pending)'),
      createdTime: z.string().describe('When the document was generated'),
      fileUrl: z.string().optional().describe('Download URL for the generated document'),
      fileName: z.string().optional().describe('Generated file name')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        workspaceId: ctx.auth.workspaceId
      });

      let lastPolledTime = ctx.state?.lastPolledTime as string | undefined;

      let result = await client.listMergeHistory({
        ordering: '-created_time',
        startDate: lastPolledTime
      });

      let newEntries = result.results;

      // If we have a lastPolledTime, filter to only new entries
      if (lastPolledTime) {
        newEntries = newEntries.filter(entry => entry.created_time > lastPolledTime);
      }

      let newLastPolledTime =
        newEntries.length > 0 ? newEntries[0]!.created_time : lastPolledTime;

      return {
        inputs: newEntries.map(entry => ({
          historyId: entry.id,
          templateId: entry.template,
          templateTitle: entry.template_title,
          status: entry.status,
          createdTime: entry.created_time,
          fileUrl: entry.file_url,
          fileName: entry.file_name
        })),
        updatedState: {
          lastPolledTime: newLastPolledTime
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `document.generated`,
        id: String(ctx.input.historyId),
        output: {
          historyId: ctx.input.historyId,
          templateId: ctx.input.templateId,
          templateTitle: ctx.input.templateTitle,
          status: ctx.input.status,
          createdTime: ctx.input.createdTime,
          fileUrl: ctx.input.fileUrl,
          fileName: ctx.input.fileName
        }
      };
    }
  })
  .build();
