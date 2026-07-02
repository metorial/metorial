import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { MailchimpClient } from '../lib/client';
import { mailchimpServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageAutomationTool = SlateTool.create(spec, {
  name: 'Manage Automation',
  key: 'manage_automation',
  description: `Control a classic automation workflow: start, pause, or archive it. Can also add or remove subscribers from the automation queue.`,
  instructions: [
    'Use "start" to activate all emails in the workflow.',
    'Use "pause" to pause all emails in the workflow.',
    'Use "archive" to permanently end the workflow.',
    'Use "list_emails" to discover automation email IDs.',
    'Use "add_subscriber" to add a subscriber to a specific email queue (requires emailId).',
    'Use "remove_subscriber" to remove a subscriber from the entire workflow.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      workflowId: z.string().describe('Automation workflow ID'),
      action: z
        .enum([
          'list_emails',
          'start',
          'pause',
          'archive',
          'add_subscriber',
          'remove_subscriber'
        ])
        .describe('Action to perform'),
      emailAddress: z
        .string()
        .optional()
        .describe('Subscriber email (required for add/remove subscriber)'),
      emailId: z
        .string()
        .optional()
        .describe('Automation email ID (required for add_subscriber)')
    })
  )
  .output(
    z.object({
      workflowId: z.string(),
      action: z.string(),
      success: z.boolean(),
      automationEmails: z
        .array(
          z.object({
            emailId: z.string(),
            title: z.string().optional(),
            subjectLine: z.string().optional(),
            status: z.string().optional(),
            emailsSent: z.number().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailchimpClient({
      token: ctx.auth.token,
      serverPrefix: ctx.auth.serverPrefix
    });

    let { workflowId, action } = ctx.input;

    switch (action) {
      case 'list_emails': {
        let result = await client.getAutomationEmails(workflowId);
        let automationEmails = (result.emails ?? []).map((email: any) => ({
          emailId: email.id,
          title: email.settings?.title,
          subjectLine: email.settings?.subject_line,
          status: email.status,
          emailsSent: email.emails_sent
        }));

        return {
          output: { workflowId, action, success: true, automationEmails },
          message: `Found **${automationEmails.length}** email(s) in automation ${workflowId}.`
        };
      }
      case 'start':
        await client.startAutomation(workflowId);
        return {
          output: { workflowId, action, success: true },
          message: `Automation **${workflowId}** has been started.`
        };
      case 'pause':
        await client.pauseAutomation(workflowId);
        return {
          output: { workflowId, action, success: true },
          message: `Automation **${workflowId}** has been paused.`
        };
      case 'archive':
        await client.archiveAutomation(workflowId);
        return {
          output: { workflowId, action, success: true },
          message: `Automation **${workflowId}** has been archived.`
        };
      case 'add_subscriber':
        if (!ctx.input.emailId || !ctx.input.emailAddress) {
          throw mailchimpServiceError(
            'emailId and emailAddress are required when action is "add_subscriber".'
          );
        }

        await client.addSubscriberToAutomationQueue(
          workflowId,
          ctx.input.emailId,
          ctx.input.emailAddress
        );
        return {
          output: { workflowId, action, success: true },
          message: `Subscriber **${ctx.input.emailAddress}** added to automation email queue.`
        };
      case 'remove_subscriber':
        if (!ctx.input.emailAddress) {
          throw mailchimpServiceError(
            'emailAddress is required when action is "remove_subscriber".'
          );
        }

        await client.removeSubscriberFromAutomation(workflowId, ctx.input.emailAddress);
        return {
          output: { workflowId, action, success: true },
          message: `Subscriber **${ctx.input.emailAddress}** removed from automation **${workflowId}**.`
        };
    }
  })
  .build();
