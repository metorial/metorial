import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSummary = SlateTool.create(spec, {
  name: 'Get Summary',
  key: 'get_summary',
  description: `Retrieve the AI-generated summary for a specific meeting recording. Returns the summary in Markdown format along with the template name used to generate it.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      recordingId: z
        .number()
        .describe('The recording ID of the meeting to get the summary for')
    })
  )
  .output(
    z.object({
      templateName: z
        .string()
        .nullable()
        .describe('Name of the summary template used (e.g., "general")'),
      content: z.string().nullable().describe('AI-generated summary in Markdown format')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getSummary(ctx.input.recordingId);

    return {
      output: {
        templateName: data.summary.template_name,
        content: data.summary.markdown_formatted
      },
      message: data.summary.markdown_formatted
        ? `Retrieved AI summary for recording **${ctx.input.recordingId}** using template "${data.summary.template_name || 'default'}".`
        : `No summary available for recording **${ctx.input.recordingId}**.`
    };
  })
  .build();
