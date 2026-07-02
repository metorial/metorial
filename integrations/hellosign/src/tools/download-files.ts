import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadFiles = SlateTool.create(spec, {
  name: 'Download Files',
  key: 'download_files',
  description: `Get a download URL for the documents associated with a signature request or template. Returns a temporary URL that can be used to download the files as PDF or ZIP.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['signature_request', 'template'])
        .describe('Whether to download files from a signature request or a template'),
      resourceId: z.string().describe('ID of the signature request or template'),
      fileType: z
        .enum(['pdf', 'zip'])
        .optional()
        .describe('File format to download (default: pdf)')
    })
  )
  .output(
    z.object({
      fileUrl: z.string().describe('Temporary URL to download the files'),
      resourceType: z.string().describe('Type of the resource'),
      resourceId: z.string().describe('ID of the resource')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let fileUrl: string;

    if (ctx.input.resourceType === 'signature_request') {
      let result = await client.getSignatureRequestFiles(
        ctx.input.resourceId,
        ctx.input.fileType
      );
      fileUrl = result.fileUrl;
    } else {
      let result = await client.getTemplateFiles(ctx.input.resourceId, ctx.input.fileType);
      fileUrl = result.fileUrl;
    }

    return {
      output: {
        fileUrl,
        resourceType: ctx.input.resourceType,
        resourceId: ctx.input.resourceId
      },
      message: `Download URL generated for ${ctx.input.resourceType} **${ctx.input.resourceId}** (${ctx.input.fileType || 'pdf'}).`
    };
  })
  .build();
