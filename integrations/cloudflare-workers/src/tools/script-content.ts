import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let scriptSyntaxSchema = z
  .enum(['module', 'service_worker'])
  .optional()
  .describe('Worker syntax for uploaded content. Defaults to module syntax.');

export let getScriptContent = SlateTool.create(spec, {
  name: 'Download Worker Script Content',
  key: 'get_script_content',
  description: `Download a Worker's script content as a Slate attachment. Use this when you need to inspect or archive the deployed source without putting full file content in tool output fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scriptName: z.string().describe('Name of the Worker script')
    })
  )
  .output(
    z.object({
      scriptName: z.string().describe('Name of the Worker script'),
      contentType: z.string().describe('MIME type of the downloaded script content'),
      sizeBytes: z.number().describe('Downloaded content size in bytes'),
      attachmentCount: z.number().describe('Number of Slate attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let content = await client.getScriptContent(ctx.input.scriptName);

    return {
      output: {
        scriptName: ctx.input.scriptName,
        contentType: content.contentType,
        sizeBytes: content.sizeBytes,
        attachmentCount: 1
      },
      attachments: [createTextAttachment(content.content, content.contentType)],
      message: `Downloaded script content for Worker **${ctx.input.scriptName}** (${content.sizeBytes} bytes).`
    };
  })
  .build();

export let putScriptContent = SlateTool.create(spec, {
  name: 'Update Worker Script Content',
  key: 'put_script_content',
  description: `Replace a Worker's script content without changing its existing configuration or metadata. Use Upload Worker Module when you also need to change bindings, compatibility settings, or annotations.`
})
  .input(
    z.object({
      scriptName: z.string().describe('Name of the Worker script'),
      scriptContent: z.string().describe('Worker source code to upload'),
      syntax: scriptSyntaxSchema,
      moduleName: z
        .string()
        .optional()
        .describe(
          'Filename for the uploaded script part. Defaults to index.js for module syntax and worker.js for service-worker syntax.'
        ),
      contentType: z.string().optional().describe('MIME type for the uploaded code part')
    })
  )
  .output(
    z.object({
      scriptId: z.string().describe('Worker script identifier'),
      updated: z.boolean().describe('Whether the content update was accepted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.putScriptContent({
      scriptName: ctx.input.scriptName,
      scriptContent: ctx.input.scriptContent,
      syntax: ctx.input.syntax,
      moduleName: ctx.input.moduleName,
      contentType: ctx.input.contentType
    });

    return {
      output: {
        scriptId: result?.id || ctx.input.scriptName,
        updated: true
      },
      message: `Updated script content for Worker **${ctx.input.scriptName}**.`
    };
  })
  .build();
