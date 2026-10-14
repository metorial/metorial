import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { exportResponse, mapFields } from '../lib/mappers';
import { spec } from '../spec';

export let getData = SlateTool.create(spec, {
  name: 'Get Data',
  key: 'get_data',
  description:
    'Retrieve research data metadata and custom fields by ID. Optionally prepare its full content as a downloadable HTML or Markdown file.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      dataId: z.string().describe('Data ID from list_data or manage_data.'),
      exportFormat: z
        .enum(['html', 'markdown'])
        .optional()
        .describe('Prepare the content in this downloadable format.')
    })
  )
  .output(
    z.object({
      dataId: z.string(),
      title: z.string(),
      fileIds: z.array(z.string()).optional().describe('Associated file IDs for get_file.'),
      createdAt: z.string(),
      deleted: z.boolean(),
      projectId: z.string().nullable(),
      projectTitle: z.string().nullable(),
      folderId: z.string().nullable(),
      fields: z.array(z.object({ label: z.string(), value: z.string().nullable() })).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getData(ctx.input.dataId);
    if (ctx.input.exportFormat) {
      let exported = await client.exportData(data.id, ctx.input.exportFormat);
      await ctx.addAttachment({
        type: 'content',
        content: exportResponse(exported, ctx.input.exportFormat),
        filename: `dovetail-data-${encodeURIComponent(data.id)}.${ctx.input.exportFormat === 'html' ? 'html' : 'md'}`
      });
    }
    return {
      output: {
        dataId: data.id,
        title: data.title,
        fileIds: data.files?.map(file => file.id),
        createdAt: data.created_at,
        deleted: data.deleted,
        projectId: data.project?.id ?? null,
        projectTitle: data.project?.title ?? null,
        folderId: data.folder?.id ?? null,
        fields: mapFields(data.fields)
      },
      message: `Retrieved data entry **${data.title}**${ctx.input.exportFormat ? ` (exported as ${ctx.input.exportFormat})` : ''}.`
    };
  })
  .build();
