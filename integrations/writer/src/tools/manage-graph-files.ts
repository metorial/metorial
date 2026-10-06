import { SlateTool } from 'slates';
import { z } from 'zod';
import { WriterClient } from '../lib/client';
import { fileIdSchema, graphIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let addFileToGraph = SlateTool.create(spec, {
  name: 'Add File to Knowledge Graph',
  key: 'add_file_to_graph',
  description: `Add an uploaded file to a Knowledge Graph. Call list_knowledge_graphs and list_files to discover IDs. Upload the file with upload_file and wait for get_file to report completed before adding it.`,
  instructions: [
    'The file must already be uploaded to Writer before it can be added to a Knowledge Graph.',
    'Supported file types: PDF, TXT, DOC/DOCX, PPT/PPTX, EML, HTML, SRT, CSV, XLS/XLSX.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      graphId: graphIdSchema,
      fileId: fileIdSchema
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('ID of the added file'),
      name: z.string().describe('Name of the file'),
      createdAt: z.string().describe('File creation timestamp'),
      graphIds: z.array(z.string()).describe('Knowledge Graphs the file is associated with'),
      status: z.string().describe('File processing status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WriterClient(ctx.auth.token);

    ctx.progress('Adding file to Knowledge Graph...');
    let result = await client.addFileToGraph(ctx.input.graphId, ctx.input.fileId);

    return {
      output: result,
      message: `Added file **${result.name}** to Knowledge Graph \`${ctx.input.graphId}\``
    };
  })
  .build();

export let removeFileFromGraph = SlateTool.create(spec, {
  name: 'Remove File from Knowledge Graph',
  key: 'remove_file_from_graph',
  description: `Remove a file from a Knowledge Graph. Call list_knowledge_graphs and list_files to discover IDs. The file can be re-added later or used with other graphs.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      graphId: graphIdSchema,
      fileId: fileIdSchema
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether the removal was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WriterClient(ctx.auth.token);

    ctx.progress('Removing file from Knowledge Graph...');
    await client.removeFileFromGraph(ctx.input.graphId, ctx.input.fileId);

    return {
      output: { removed: true },
      message: `Removed file \`${ctx.input.fileId}\` from Knowledge Graph \`${ctx.input.graphId}\``
    };
  })
  .build();
