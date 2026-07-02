import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLibraryTemplate = SlateTool.create(spec, {
  name: 'Get Library Template',
  key: 'get_library_template',
  description: `Retrieve detailed information about an Adobe Acrobat Sign library template, including sharing mode, template types, state/status, owner, and file metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      libraryDocumentId: z.string().describe('ID of the library template to retrieve')
    })
  )
  .output(
    z.object({
      libraryDocumentId: z.string().describe('ID of the library template'),
      name: z.string().optional().describe('Template name'),
      status: z.string().optional().describe('Template status'),
      state: z.string().optional().describe('Template state'),
      sharingMode: z.string().optional().describe('Template sharing scope'),
      templateTypes: z.array(z.string()).optional().describe('Template types'),
      ownerEmail: z.string().optional().describe('Email of the template owner'),
      createdDate: z.string().optional().describe('Date the template was created'),
      modifiedDate: z.string().optional().describe('Date the template was last modified'),
      raw: z.any().describe('Raw library template detail returned by Adobe Acrobat Sign')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    let template = await client.getLibraryDocument(ctx.input.libraryDocumentId);

    return {
      output: {
        libraryDocumentId: template.id || ctx.input.libraryDocumentId,
        name: template.name,
        status: template.status,
        state: template.state,
        sharingMode: template.sharingMode,
        templateTypes: template.templateTypes,
        ownerEmail: template.ownerEmail,
        createdDate: template.createdDate,
        modifiedDate: template.modifiedDate,
        raw: template
      },
      message: `Retrieved library template \`${template.id || ctx.input.libraryDocumentId}\`${template.status ? ` in status **${template.status}**` : ''}.`
    };
  });
