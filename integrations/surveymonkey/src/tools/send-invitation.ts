import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { id, invalid } from '../lib/response';
import { spec } from '../spec';

export let sendInvitation = SlateTool.create(spec, {
  name: 'Manage Survey Invitation',
  key: 'send_invitation',
  description:
    'Prepare, send, explicitly resume, inspect, or delete an email or SMS invitation message. Sending can queue delivery and has recipient/contact limits. Deleting a message does not recall delivered invitations or erase responses.',
  instructions: [
    'Use prepare to create a draft and add contact-list recipients without sending. Record its messageId.',
    'send retains the existing create-and-send workflow. resume requires an existing messageId and never adds recipients or creates a replacement message.',
    'After a timeout or uncertain send, use get with the same messageId. Do not create or resend a replacement implicitly.',
    'Email content must preserve [SurveyLink], [OptOutLink], [PrivacyLink], and [FooterLink]. Recipients must have consented to receive the invitation.'
  ]
})
  .input(
    z.object({
      collectorId: id.describe(
        'Email or SMS collector ID. Use list_collectors and get_resource to inspect it.'
      ),
      action: z.enum(['send', 'prepare', 'resume', 'get', 'delete']).default('send'),
      messageId: id
        .optional()
        .describe(
          'Required for resume, get, or delete. Preserve this ID after partial failure.'
        ),
      messageType: z.enum(['invite', 'reminder', 'thank_you']).default('invite'),
      subject: z.string().optional(),
      bodyHtml: z.string().optional(),
      bodyText: z.string().optional(),
      recipientStatus: z
        .string()
        .optional()
        .describe('Provider recipient filter for reminder or thank_you messages.'),
      contactListIds: z
        .array(id)
        .min(1)
        .max(1000)
        .optional()
        .describe(
          'Lists to add to a newly created invite. Omit for resume/get/delete and reminder/thank_you messages.'
        )
    })
  )
  .output(
    z.object({
      messageId: z.string(),
      messageType: z.string().optional(),
      status: z.string().optional(),
      deliveryState: z.enum(['draft', 'requested', 'scheduled', 'observed', 'deleted']),
      isScheduled: z.boolean().optional(),
      scheduledDate: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let input = ctx.input;
    let client = new Client(ctx.auth);
    let existing = ['resume', 'get', 'delete'].includes(input.action);
    if (existing && !input.messageId)
      throw invalid('Provide the existing messageId for resume, get, or delete.');
    if (!existing && input.messageId)
      throw invalid(
        'Use resume or get for an existing messageId; send never replaces an existing message.'
      );
    if (
      existing &&
      (input.contactListIds ||
        input.subject !== undefined ||
        input.bodyHtml !== undefined ||
        input.bodyText !== undefined ||
        input.recipientStatus !== undefined)
    )
      throw invalid(
        'resume, get, and delete use the existing message unchanged. Omit recipient lists and composition fields.'
      );
    if (!existing && input.messageType === 'invite' && !input.contactListIds)
      throw invalid('Provide contactListIds when preparing a new invite.');
    if (!existing && input.messageType !== 'invite' && input.contactListIds)
      throw invalid(
        'Reminder and thank_you messages use the collector’s existing recipient filter; contact lists cannot be added to these message types.'
      );
    if (input.action === 'get') {
      let message = await client.getMessage(input.collectorId, input.messageId!);
      return {
        output: {
          messageId: message.id,
          messageType: message.type,
          status: message.status,
          deliveryState: 'observed' as const,
          isScheduled: message.is_scheduled,
          scheduledDate: message.scheduled_date
        },
        message: `Message ${message.id}: ${message.status}.`
      };
    }
    let collector = await client.getCollector(input.collectorId);
    if (!['email', 'sms'].includes(collector.type))
      throw invalid('Choose an email or SMS collector.');
    let messageId = input.messageId;
    try {
      if (input.action === 'delete') {
        await client.getMessage(input.collectorId, messageId!);
        await client.deleteMessage(input.collectorId, messageId!);
        return {
          output: { messageId: messageId!, deliveryState: 'deleted' as const, deleted: true },
          message:
            'Message deletion confirmed. Previously delivered invitations and responses are not recalled or erased.'
        };
      }
      if (
        !existing &&
        collector.type === 'email' &&
        (input.bodyHtml !== undefined || input.bodyText !== undefined)
      ) {
        for (let value of ['[SurveyLink]', '[OptOutLink]', '[PrivacyLink]', '[FooterLink]'])
          if (!(input.bodyHtml ?? input.bodyText)?.includes(value))
            throw invalid(
              'Provide email content with every required survey, unsubscribe, privacy, and footer placeholder.'
            );
      }
      if (!existing && collector.type === 'sms' && !input.bodyText?.trim())
        throw invalid('Provide bodyText for an SMS invitation.');
      let message = existing
        ? await client.getMessage(input.collectorId, messageId!)
        : await client.createMessage(
            input.collectorId,
            {
              type: input.messageType,
              subject: input.subject,
              bodyHtml: input.bodyHtml,
              bodyText: input.bodyText,
              recipientStatus: input.recipientStatus
            },
            receivedId => {
              messageId = receivedId;
            }
          );
      messageId = message.id;
      if (message.status !== 'not_sent' || message.is_scheduled)
        throw invalid(
          `Message ${messageId} is ${message.status}${message.is_scheduled ? ' and scheduled' : ''}. Inspect it with get; no send was attempted.`
        );
      if (input.contactListIds) {
        let receipt = await client.addMessageRecipients(
          input.collectorId,
          messageId,
          input.contactListIds
        );
        if (
          [
            receipt.invalids,
            receipt.existing,
            receipt.bounced ?? [],
            receipt.opted_out ?? [],
            receipt.duplicate ?? []
          ].some(values => values.length > 0) ||
          !receipt.succeeded.length
        )
          throw invalid(
            `Recipients for message ${messageId} were only partially accepted or none were added. Inspect the draft before any explicit resume; no send was attempted.`
          );
      }
      if (input.action === 'prepare')
        return {
          output: {
            messageId,
            messageType: message.type,
            status: message.status,
            deliveryState: 'draft' as const
          },
          message: `Prepared draft ${messageId}. No invitation was sent. Inspect recipients before explicitly resuming.`
        };
      let recipients = await client.listMessageRecipients(input.collectorId, messageId);
      if (!recipients.total)
        throw invalid(`Message ${messageId} has no recipients. No send was attempted.`);
      let receipt = await client.sendMessage(input.collectorId, messageId);
      let current = await client.getMessage(input.collectorId, messageId);
      return {
        output: {
          messageId,
          messageType: current.type,
          status: current.status,
          deliveryState: receipt.is_scheduled
            ? ('scheduled' as const)
            : ('requested' as const),
          isScheduled: receipt.is_scheduled,
          scheduledDate: receipt.scheduled_date ?? undefined
        },
        message: `Send request accepted for message ${messageId}; current status is ${current.status}. Delivery may still be queued. Inspect this ID before retrying.`
      };
    } catch (error) {
      if (!messageId) throw error;
      let recoveryError = createApiServiceError(
        `Invitation operation for message ${messageId} did not complete reliably. Creation, recipient changes, or delivery may already have happened. Use get with collectorId ${input.collectorId} and messageId ${messageId}; inspect recipients and never recreate or resend implicitly.`,
        { reason: 'surveymonkey_invitation_uncertain' }
      );
      Object.assign(recoveryError.data, { collectorId: input.collectorId, messageId });
      throw recoveryError;
    }
  })
  .build();
