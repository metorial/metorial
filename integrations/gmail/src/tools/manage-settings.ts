import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { gmailActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageSettings = SlateTool.create(spec, {
  name: 'Manage Settings',
  key: 'manage_settings',
  description: `View and manage Gmail settings including vacation responder (auto-reply), mail filters, forwarding addresses, and send-as aliases with signatures.`,
  instructions: [
    'Use **action** "get_vacation" to check current vacation responder settings.',
    'Use **action** "update_vacation" to enable/disable or configure the vacation responder.',
    'Use **action** "list_filters" to see all mail filters.',
    'Use **action** "create_filter" to create a new mail filter with criteria and actions.',
    'Use **action** "delete_filter" to remove a mail filter.',
    'Use **action** "list_forwarding" to list forwarding addresses.',
    'Use **action** "list_send_as" to list send-as aliases and their signatures.',
    'Use **action** "update_send_as" to update a send-as alias display name, reply-to, or signature.'
  ],
  tags: {
    readOnly: false
  }
})
  .scopes(gmailActionScopes.manageSettings)
  .input(
    z.object({
      action: z
        .enum([
          'get_vacation',
          'update_vacation',
          'list_filters',
          'create_filter',
          'delete_filter',
          'list_forwarding',
          'list_send_as',
          'update_send_as'
        ])
        .describe('Settings operation to perform.'),

      // Vacation responder fields
      enableAutoReply: z
        .boolean()
        .optional()
        .describe('Enable or disable vacation auto-reply.'),
      responseSubject: z.string().optional().describe('Auto-reply subject line.'),
      responseBodyPlainText: z.string().optional().describe('Auto-reply plain text body.'),
      responseBodyHtml: z.string().optional().describe('Auto-reply HTML body.'),
      restrictToContacts: z.boolean().optional().describe('Only auto-reply to contacts.'),
      restrictToDomain: z
        .boolean()
        .optional()
        .describe('Only auto-reply within your organization domain.'),
      startTime: z.string().optional().describe('Vacation start time (epoch ms as string).'),
      endTime: z.string().optional().describe('Vacation end time (epoch ms as string).'),

      // Filter fields
      filterId: z.string().optional().describe('Filter ID (for delete_filter).'),
      filterCriteria: z
        .object({
          from: z.string().optional().describe('Match sender.'),
          to: z.string().optional().describe('Match recipient.'),
          subject: z.string().optional().describe('Match subject.'),
          query: z.string().optional().describe('Gmail search query to match.'),
          negatedQuery: z
            .string()
            .optional()
            .describe('Negated query (messages NOT matching).'),
          hasAttachment: z.boolean().optional().describe('Match messages with attachments.'),
          excludeChats: z.boolean().optional().describe('Exclude chat messages.')
        })
        .optional()
        .describe('Filter matching criteria (for create_filter).'),
      filterAction: z
        .object({
          addLabelIds: z.array(z.string()).optional().describe('Labels to apply.'),
          removeLabelIds: z.array(z.string()).optional().describe('Labels to remove.'),
          forward: z.string().optional().describe('Forward to email address.')
        })
        .optional()
        .describe('Actions to perform on matching messages (for create_filter).'),

      // Send-as fields
      sendAsEmail: z
        .string()
        .optional()
        .describe('Send-as email address (for update_send_as).'),
      displayName: z.string().optional().describe('Display name for send-as alias.'),
      replyToAddress: z.string().optional().describe('Reply-to address for send-as alias.'),
      signature: z.string().optional().describe('HTML email signature for send-as alias.')
    })
  )
  .output(
    z.object({
      vacation: z
        .object({
          enableAutoReply: z.boolean(),
          responseSubject: z.string().optional(),
          responseBodyPlainText: z.string().optional(),
          responseBodyHtml: z.string().optional(),
          restrictToContacts: z.boolean().optional(),
          restrictToDomain: z.boolean().optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional()
        })
        .optional()
        .describe('Vacation responder settings.'),

      filters: z
        .array(
          z.object({
            filterId: z.string(),
            criteria: z.object({
              from: z.string().optional(),
              to: z.string().optional(),
              subject: z.string().optional(),
              query: z.string().optional(),
              hasAttachment: z.boolean().optional()
            }),
            action: z.object({
              addLabelIds: z.array(z.string()).optional(),
              removeLabelIds: z.array(z.string()).optional(),
              forward: z.string().optional()
            })
          })
        )
        .optional()
        .describe('Mail filters.'),

      createdFilter: z
        .object({
          filterId: z.string()
        })
        .optional()
        .describe('Newly created filter.'),

      forwardingAddresses: z
        .array(
          z.object({
            forwardingEmail: z.string(),
            verificationStatus: z.string()
          })
        )
        .optional()
        .describe('Forwarding addresses.'),

      sendAsAliases: z
        .array(
          z.object({
            sendAsEmail: z.string(),
            displayName: z.string(),
            replyToAddress: z.string().optional(),
            signature: z.string().optional(),
            isPrimary: z.boolean().optional(),
            isDefault: z.boolean().optional()
          })
        )
        .optional()
        .describe('Send-as aliases.'),

      updatedSendAs: z
        .object({
          sendAsEmail: z.string(),
          displayName: z.string().optional()
        })
        .optional()
        .describe('Updated send-as alias.'),

      deleted: z.boolean().optional().describe('Whether deletion was successful.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.config.userId
    });

    let { action } = ctx.input;

    if (action === 'get_vacation') {
      let settings = await client.getVacationSettings();
      return {
        output: { vacation: settings },
        message: settings.enableAutoReply
          ? `Vacation responder is **enabled**: "${settings.responseSubject || '(no subject)'}".`
          : 'Vacation responder is **disabled**.'
      };
    }

    if (action === 'update_vacation') {
      let settings = await client.updateVacationSettings({
        enableAutoReply: ctx.input.enableAutoReply ?? false,
        responseSubject: ctx.input.responseSubject,
        responseBodyPlainText: ctx.input.responseBodyPlainText,
        responseBodyHtml: ctx.input.responseBodyHtml,
        restrictToContacts: ctx.input.restrictToContacts,
        restrictToDomain: ctx.input.restrictToDomain,
        startTime: ctx.input.startTime,
        endTime: ctx.input.endTime
      });
      return {
        output: { vacation: settings },
        message: settings.enableAutoReply
          ? `Vacation responder **enabled** with subject "${settings.responseSubject || '(no subject)'}".`
          : 'Vacation responder **disabled**.'
      };
    }

    if (action === 'list_filters') {
      let filters = await client.listFilters();
      return {
        output: {
          filters: filters.map(f => ({
            filterId: f.id,
            criteria: {
              from: f.criteria?.from,
              to: f.criteria?.to,
              subject: f.criteria?.subject,
              query: f.criteria?.query,
              hasAttachment: f.criteria?.hasAttachment
            },
            action: {
              addLabelIds: f.action?.addLabelIds,
              removeLabelIds: f.action?.removeLabelIds,
              forward: f.action?.forward
            }
          }))
        },
        message: `Found **${filters.length}** mail filters.`
      };
    }

    if (action === 'create_filter') {
      if (!ctx.input.filterCriteria || !ctx.input.filterAction) {
        throw new Error('filterCriteria and filterAction are required for create_filter');
      }
      let filter = await client.createFilter({
        criteria: ctx.input.filterCriteria,
        action: ctx.input.filterAction
      });
      return {
        output: { createdFilter: { filterId: filter.id } },
        message: `Filter **${filter.id}** created.`
      };
    }

    if (action === 'delete_filter') {
      if (!ctx.input.filterId) throw new Error('filterId is required for delete_filter');
      await client.deleteFilter(ctx.input.filterId);
      return {
        output: { deleted: true },
        message: `Filter **${ctx.input.filterId}** deleted.`
      };
    }

    if (action === 'list_forwarding') {
      let addresses = await client.listForwardingAddresses();
      return {
        output: { forwardingAddresses: addresses },
        message: `Found **${addresses.length}** forwarding addresses.`
      };
    }

    if (action === 'list_send_as') {
      let aliases = await client.getSendAs();
      return {
        output: {
          sendAsAliases: aliases.map(a => ({
            sendAsEmail: a.sendAsEmail,
            displayName: a.displayName,
            replyToAddress: a.replyToAddress,
            signature: a.signature,
            isPrimary: a.isPrimary,
            isDefault: a.isDefault
          }))
        },
        message: `Found **${aliases.length}** send-as aliases.`
      };
    }

    if (action === 'update_send_as') {
      if (!ctx.input.sendAsEmail)
        throw new Error('sendAsEmail is required for update_send_as');
      let result = await client.updateSendAs(ctx.input.sendAsEmail, {
        displayName: ctx.input.displayName,
        replyToAddress: ctx.input.replyToAddress,
        signature: ctx.input.signature
      });
      return {
        output: {
          updatedSendAs: {
            sendAsEmail: result.sendAsEmail,
            displayName: result.displayName
          }
        },
        message: `Send-as alias **${ctx.input.sendAsEmail}** updated.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  });
