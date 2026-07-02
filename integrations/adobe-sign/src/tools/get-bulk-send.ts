import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBulkSend = SlateTool.create(spec, {
  name: 'Get Bulk Send',
  key: 'get_bulk_send',
  description: `Retrieve detailed information about a Send in Bulk (MegaSign) parent agreement, including status, sender, child agreement metadata, recipient configuration, and reminder settings.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      bulkSendId: z.string().describe('ID of the Send in Bulk parent agreement')
    })
  )
  .output(
    z.object({
      bulkSendId: z.string().describe('ID of the Send in Bulk parent agreement'),
      name: z.string().optional().describe('Name of the Send in Bulk operation'),
      status: z.string().optional().describe('Current status'),
      state: z.string().optional().describe('Current state'),
      senderEmail: z.string().optional().describe('Email address of the sender'),
      numChildren: z.number().optional().describe('Number of child agreements'),
      signatureType: z.string().optional().describe('Signature type'),
      childAgreementsInfo: z.any().optional().describe('Child agreement metadata'),
      raw: z.any().describe('Raw Send in Bulk detail returned by Adobe Acrobat Sign')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    let bulkSend = await client.getMegaSign(ctx.input.bulkSendId);

    return {
      output: {
        bulkSendId: bulkSend.id || ctx.input.bulkSendId,
        name: bulkSend.name,
        status: bulkSend.status,
        state: bulkSend.state,
        senderEmail: bulkSend.senderEmail,
        numChildren: bulkSend.numChildren,
        signatureType: bulkSend.signatureType,
        childAgreementsInfo: bulkSend.childAgreementsInfo,
        raw: bulkSend
      },
      message: `Retrieved Send in Bulk \`${bulkSend.id || ctx.input.bulkSendId}\`${bulkSend.status ? ` in status **${bulkSend.status}**` : ''}.`
    };
  });
