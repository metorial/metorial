import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validateInput } from '../lib/contracts';
import { spec } from '../spec';

export const downloadDatasourceInstanceData = SlateTool.create(spec, {
  key: 'download_datasource_instance_data',
  name: 'Download Data Source Instance Data',
  description:
    'Download stored data source content as a file. The file contains the data returned by the instance data endpoint, with its JSON response wrapper removed.',
  instructions: [
    'Find an instance ID with list_datasource_instances. Select a format only when you know the stored content format; the format selects file metadata and does not convert the data.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      instanceId: z.string().describe('Data source instance ID'),
      format: z
        .enum(['auto', 'csv', 'json', 'xml', 'text'])
        .optional()
        .describe(
          'File format metadata; default auto detects JSON/XML and otherwise uses plain text'
        )
    })
  )
  .output(
    z.object({
      instanceId: z.string(),
      filename: z.string(),
      mimeType: z.string(),
      byteLength: z.number()
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
    const data = await new Client({ token: ctx.auth.token }).getDatasourceInstanceData(
      ctx.input.instanceId
    );
    if (data === undefined || data === null)
      throw createApiServiceError(
        'No stored content was returned for this instance. Check its refresh status.',
        { reason: 'invalid_response' }
      );
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    let format = ctx.input.format ?? 'auto';
    if (format === 'auto') {
      if (typeof data !== 'string') format = 'json';
      else if (content.trimStart().startsWith('<')) format = 'xml';
      else {
        try {
          JSON.parse(content);
          format = 'json';
        } catch {
          format = 'text';
        }
      }
    }
    const mimeType = {
      csv: 'text/csv',
      json: 'application/json',
      xml: 'application/xml',
      text: 'text/plain'
    }[format];
    const filename = `datasource-${ctx.input.instanceId.replace(/[^a-zA-Z0-9_-]/g, '_')}.${format === 'text' ? 'txt' : format}`;
    await ctx.addAttachment({
      type: 'content',
      filename,
      mimeType,
      content: new Response(content)
    });
    return {
      output: {
        instanceId: ctx.input.instanceId,
        filename,
        mimeType,
        byteLength: new TextEncoder().encode(content).byteLength
      },
      message: `Downloaded stored data for instance ${ctx.input.instanceId}.`
    };
  })
  .build();
