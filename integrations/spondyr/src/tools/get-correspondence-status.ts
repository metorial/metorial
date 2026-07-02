import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpondyrClient } from '../lib/client';
import { spec } from '../spec';

export let getCorrespondenceStatus = SlateTool.create(spec, {
  name: 'Get Correspondence Status',
  key: 'get_correspondence_status',
  description: `Check the processing and delivery status of a previously submitted correspondence request. Returns the current status, creation date, and optionally the associated transaction data.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      referenceId: z
        .string()
        .describe('The reference ID returned when the correspondence was created'),
      includeData: z
        .boolean()
        .optional()
        .default(false)
        .describe('When true, includes the original transaction data in the response')
    })
  )
  .output(
    z.object({
      apiStatus: z
        .string()
        .describe('Current processing status (e.g. "OK" when processed successfully)'),
      referenceId: z.string().describe('Reference ID of the correspondence'),
      createdDate: z.string().describe('Date when the correspondence was created'),
      transactionData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Original transaction data, included when includeData is true')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpondyrClient({
      token: ctx.auth.token,
      applicationToken: ctx.auth.applicationToken
    });

    let result = await client.getCorrespondenceStatus({
      referenceId: ctx.input.referenceId,
      includeData: ctx.input.includeData
    });

    return {
      output: {
        apiStatus: result.apiStatus,
        referenceId: result.referenceId,
        createdDate: result.createdDate,
        transactionData: result.transactionData
      },
      message: `Correspondence **${result.referenceId}** status: **${result.apiStatus}**, created: ${result.createdDate}.`
    };
  })
  .build();
