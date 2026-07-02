import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let estimateActions = SlateTool.create(spec, {
  name: 'Estimate Actions',
  key: 'estimate_actions',
  description: `Perform various actions on a Zoho Invoice estimate. Supported actions include marking an estimate as sent, accepted, or declined, and sending an estimate via email.`,
  instructions: [
    'For the send_email action, provide at least emailRecipients with one or more email addresses.',
    'emailSubject and emailBody are optional for send_email but recommended for clarity.',
    'Actions other than send_email do not require email-related fields.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      estimateId: z.string().describe('ID of the estimate'),
      action: z
        .enum(['mark_as_sent', 'mark_as_accepted', 'mark_as_declined', 'send_email'])
        .describe('Action to perform'),
      emailRecipients: z
        .array(z.string())
        .optional()
        .describe('Email addresses (for send_email action)'),
      emailSubject: z.string().optional().describe('Email subject (for send_email action)'),
      emailBody: z.string().optional().describe('Email body (for send_email action)')
    })
  )
  .output(
    z.object({
      estimateId: z.string(),
      action: z.string(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      region: ctx.auth.region
    });

    let { estimateId, action, emailRecipients, emailSubject, emailBody } = ctx.input;

    switch (action) {
      case 'mark_as_sent': {
        await client.markEstimateAsSent(estimateId);
        break;
      }
      case 'mark_as_accepted': {
        await client.markEstimateAsAccepted(estimateId);
        break;
      }
      case 'mark_as_declined': {
        await client.markEstimateAsDeclined(estimateId);
        break;
      }
      case 'send_email': {
        await client.emailEstimate(estimateId, {
          to_mail_ids: emailRecipients,
          subject: emailSubject,
          body: emailBody
        });
        break;
      }
    }

    let actionLabels: Record<string, string> = {
      mark_as_sent: 'marked as sent',
      mark_as_accepted: 'marked as accepted',
      mark_as_declined: 'marked as declined',
      send_email: 'sent via email'
    };

    return {
      output: {
        estimateId,
        action,
        success: true
      },
      message: `Estimate **${estimateId}** has been ${actionLabels[action]}.`
    };
  })
  .build();
