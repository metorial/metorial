import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEnvelopes = SlateTool.create(spec, {
  name: 'List eSign Envelopes',
  key: 'list_envelopes',
  description: `List eSignature envelopes. Envelopes represent documents sent for signing. Filter by status to find pending, completed, or declined envelopes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['created', 'pending', 'completed', 'declined', 'voided', 'expired'])
        .optional()
        .describe('Filter envelopes by status'),
      search: z.string().optional().describe('Search envelopes by title or recipient'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of envelopes'),
      envelopes: z.array(
        z.object({
          envelopeId: z.number().describe('Unique envelope ID'),
          title: z.string().optional().describe('Envelope title'),
          status: z
            .string()
            .describe(
              'Envelope status (created, pending, completed, declined, voided, expired)'
            ),
          createdTime: z.string().describe('Creation timestamp'),
          updatedTime: z.string().nullable().optional().describe('Last update timestamp')
        })
      ),
      hasMore: z.boolean().describe('Whether more pages are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let result = await client.listEnvelopes({
      status: ctx.input.status,
      search: ctx.input.search,
      page: ctx.input.page
    });

    let envelopes = result.results.map(e => ({
      envelopeId: e.id,
      title: e.title,
      status: e.status,
      createdTime: e.created_time,
      updatedTime: e.updated_time
    }));

    return {
      output: {
        totalCount: result.count,
        envelopes,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** envelope(s)${ctx.input.status ? ` with status "${ctx.input.status}"` : ''}.`
    };
  })
  .build();

export let getEnvelopeDetails = SlateTool.create(spec, {
  name: 'Get Envelope Details',
  key: 'get_envelope_details',
  description: `Get detailed information about an eSignature envelope, including recipients, document details, and activity history. Use this to track the signing progress.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      envelopeId: z.number().describe('ID of the envelope to retrieve'),
      includeHistory: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include the activity history (audit trail)')
    })
  )
  .output(
    z.object({
      envelopeId: z.number().describe('Unique envelope ID'),
      title: z.string().optional().describe('Envelope title'),
      status: z.string().describe('Current envelope status'),
      createdTime: z.string().describe('Creation timestamp'),
      recipients: z
        .array(
          z.object({
            recipientId: z.number().describe('Recipient ID'),
            name: z.string().describe('Recipient name'),
            email: z.string().describe('Recipient email'),
            role: z.string().optional().describe('Recipient role'),
            status: z.string().optional().describe('Signing status for this recipient')
          })
        )
        .optional()
        .describe('List of recipients'),
      history: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Activity history / audit trail')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let details = await client.getEnvelopeDetails(ctx.input.envelopeId);

    let history: any;
    if (ctx.input.includeHistory) {
      let rawHistory = await client.getEnvelopeHistory(ctx.input.envelopeId);
      history = rawHistory as Record<string, unknown>[];
    }

    return {
      output: {
        envelopeId: details.id,
        title: details.title,
        status: details.status,
        createdTime: details.created_time,
        recipients: details.recipients?.map(r => ({
          recipientId: r.id,
          name: r.name,
          email: r.email,
          role: r.role,
          status: r.status
        })),
        history
      },
      message: `Envelope **"${details.title ?? details.id}"** — status: **${details.status}**, ${details.recipients?.length ?? 0} recipient(s).`
    };
  })
  .build();

export let cancelEnvelope = SlateTool.create(spec, {
  name: 'Cancel Envelope',
  key: 'cancel_envelope',
  description: `Void/cancel an eSignature envelope that is pending signing. This will prevent further signing actions on the envelope.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      envelopeId: z.number().describe('ID of the envelope to cancel/void'),
      reason: z.string().optional().describe('Reason for voiding the envelope')
    })
  )
  .output(
    z.object({
      envelopeId: z.number().describe('ID of the cancelled envelope'),
      cancelled: z.boolean().describe('Whether the envelope was successfully cancelled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    await client.cancelEnvelope(ctx.input.envelopeId, ctx.input.reason);

    return {
      output: {
        envelopeId: ctx.input.envelopeId,
        cancelled: true
      },
      message: `Envelope (ID: ${ctx.input.envelopeId}) has been voided${ctx.input.reason ? `: ${ctx.input.reason}` : ''}.`
    };
  })
  .build();

export let sendEnvelopeReminder = SlateTool.create(spec, {
  name: 'Send Envelope Reminder',
  key: 'send_envelope_reminder',
  description: `Send a reminder to recipients of a pending eSignature envelope, prompting them to complete signing.`
})
  .input(
    z.object({
      envelopeId: z.number().describe('ID of the envelope to send a reminder for')
    })
  )
  .output(
    z.object({
      envelopeId: z.number().describe('ID of the envelope'),
      reminderSent: z.boolean().describe('Whether the reminder was successfully sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    await client.sendEnvelopeReminder(ctx.input.envelopeId);

    return {
      output: {
        envelopeId: ctx.input.envelopeId,
        reminderSent: true
      },
      message: `Reminder sent for envelope (ID: ${ctx.input.envelopeId}).`
    };
  })
  .build();
