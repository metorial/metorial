import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let compressPdf = SlateTool.create(spec, {
  name: 'Compress PDF',
  key: 'compress_pdf',
  description: `Optimize and compress a PDF document to reduce file size. Choose from multiple compression profiles tailored for web viewing, printing, or maximum compression.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      fileName: z.string().describe('PDF file name with extension'),
      profile: z
        .enum([
          'Default',
          'Web',
          'WebMax',
          'Print',
          'PrintMax',
          'PrintGray',
          'Max',
          'Compress',
          'CompressMax'
        ])
        .default('Default')
        .describe(
          'Compression profile: "Web"/"WebMax" for web display, "Print"/"PrintMax"/"PrintGray" for printing, "Max"/"CompressMax" for maximum compression'
        )
    })
  )
  .output(
    z.object({
      fileContent: z.string().describe('Base64-encoded compressed PDF content'),
      fileName: z.string().describe('Output file name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.optimize({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName,
      optimizeProfile: ctx.input.profile
    });

    return {
      output: result,
      message: `Successfully compressed PDF using **${ctx.input.profile}** profile: **${result.fileName}**`
    };
  })
  .build();
