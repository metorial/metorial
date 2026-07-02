import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let createAttachments = SlateTool.create(spec, {
  name: 'Create Attachments',
  key: 'create_attachments',
  description:
    'Return two inline text attachments: a static "hello world" file and a second file containing the current date.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      attachmentCount: z.number().describe('Number of attachments returned by the tool.'),
      currentDate: z
        .string()
        .describe('ISO timestamp used to generate the current-date attachment.')
    })
  )
  .handleInvocation(async () => {
    let currentDate = new Date().toISOString();

    return {
      output: {
        attachmentCount: 2,
        currentDate
      },
      message: `Created **2** text attachments: one static hello-world payload and one generated at **${currentDate}**.`,
      attachments: [
        createTextAttachment('hello world', 'text/plain'),
        createTextAttachment(currentDate, 'text/plain')
      ]
    };
  })
  .build();
