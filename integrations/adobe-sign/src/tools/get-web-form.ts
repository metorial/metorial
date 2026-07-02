import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWebForm = SlateTool.create(spec, {
  name: 'Get Web Form',
  key: 'get_web_form',
  description: `Retrieve detailed information about an Adobe Acrobat Sign web form (widget), including status, URL, owner, participants, files, and creation/modification metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      webFormId: z.string().describe('ID of the web form to retrieve')
    })
  )
  .output(
    z.object({
      webFormId: z.string().describe('ID of the web form'),
      name: z.string().optional().describe('Name of the web form'),
      status: z.string().optional().describe('Current web form status'),
      url: z.string().optional().describe('Public web form URL'),
      javascript: z.string().optional().describe('Embeddable JavaScript snippet'),
      ownerEmail: z.string().optional().describe('Email of the web form owner'),
      createdDate: z.string().optional().describe('Date the web form was created'),
      modifiedDate: z.string().optional().describe('Date the web form was last modified'),
      participantSetInfo: z.any().optional().describe('Primary web form participant set'),
      additionalParticipantSetsInfo: z
        .array(z.any())
        .optional()
        .describe('Additional participant sets on the web form'),
      raw: z.any().describe('Raw web form detail returned by Adobe Acrobat Sign')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    let webForm = await client.getWebForm(ctx.input.webFormId);

    return {
      output: {
        webFormId: webForm.id || ctx.input.webFormId,
        name: webForm.name,
        status: webForm.status,
        url: webForm.url,
        javascript: webForm.javascript,
        ownerEmail: webForm.ownerEmail,
        createdDate: webForm.createdDate,
        modifiedDate: webForm.modifiedDate,
        participantSetInfo: webForm.widgetParticipantSetInfo,
        additionalParticipantSetsInfo: webForm.additionalParticipantSetsInfo,
        raw: webForm
      },
      message: `Retrieved web form \`${webForm.id || ctx.input.webFormId}\`${webForm.status ? ` in status **${webForm.status}**` : ''}.`
    };
  });
