import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ticketSchema = z.object({
  id: z.string().describe('Unique ticket ID'),
  shortID: z.string().describe('Short human-readable ticket ID'),
  status: z
    .enum(['open', 'pending', 'on hold', 'solved', 'closed'])
    .describe('Current ticket status'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).describe('Ticket priority level'),
  subject: z.string().describe('Ticket subject line'),
  requester: z
    .object({
      email: z.string().describe('Requester email address'),
      name: z.string().optional().describe('Requester display name')
    })
    .describe('Ticket requester information'),
  teamID: z.string().describe('ID of the team assigned to this ticket'),
  assigneeID: z.string().optional().describe('ID of the agent assigned to this ticket'),
  tags: z.array(z.string()).describe('Tags applied to this ticket'),
  followers: z.array(z.string()).describe('Agent IDs following this ticket'),
  ccRecipients: z.array(z.string()).optional().describe('CC recipient email addresses'),
  customFields: z
    .record(z.string(), z.string())
    .optional()
    .describe('Custom field values keyed by field ID'),
  parentTicketID: z
    .string()
    .optional()
    .describe('ID of the parent ticket if this ticket was merged'),
  childTicketIDs: z
    .array(z.string())
    .optional()
    .describe('IDs of child tickets merged into this ticket'),
  createdAt: z.string().describe('ISO 8601 timestamp when the ticket was created'),
  updatedAt: z.string().describe('ISO 8601 timestamp when the ticket was last updated'),
  lastMessageAt: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp of the last message on this ticket'),
  rating: z
    .object({
      score: z.enum(['good', 'neutral', 'bad']).describe('Customer satisfaction rating score'),
      comment: z.string().optional().describe('Customer comment on the rating'),
      ratedAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the rating was submitted')
    })
    .optional()
    .describe('Customer satisfaction rating'),
  language: z.string().optional().describe('Detected language of the ticket'),
  spam: z.boolean().optional().describe('Whether this ticket is marked as spam'),
  silo: z
    .enum(['tickets', 'archive', 'spam', 'trash'])
    .optional()
    .describe('Which silo this ticket belongs to')
});

export let updateTicket = SlateTool.create(spec, {
  name: 'Update Ticket',
  key: 'update_ticket',
  description: `Update an existing HelpDesk ticket. This is a flexible tool that combines core ticket updates, tag management, follower management, and silo movement into a single operation. Only provide the fields you want to change; all optional fields that are omitted will remain unchanged.`,
  instructions: [
    'Only the ticketId is required. All other fields are optional and only applied if provided.',
    'Use addTags/removeTags to manage tags without replacing the entire tag list.',
    'Use addFollowers/removeFollowers to manage followers without replacing the entire follower list.',
    'Use moveToSilo to move the ticket between silos (tickets, archive, spam, trash).',
    'Multiple operations (update fields, manage tags, manage followers, move silo) can be combined in a single call.',
    'The returned ticket reflects all changes after all operations have been applied.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      ticketId: z.string().describe('The unique ID of the ticket to update'),
      subject: z.string().optional().describe('New subject line for the ticket'),
      status: z
        .enum(['open', 'pending', 'on hold', 'solved', 'closed'])
        .optional()
        .describe('New ticket status'),
      priority: z
        .enum(['low', 'medium', 'high', 'urgent'])
        .optional()
        .describe('New ticket priority level'),
      teamID: z.string().optional().describe('ID of the team to reassign the ticket to'),
      assigneeID: z.string().optional().describe('ID of the agent to reassign the ticket to'),
      ccRecipients: z
        .array(z.string())
        .optional()
        .describe('Updated list of CC recipient email addresses'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field values to update as a map of field ID to value'),
      addTags: z.array(z.string()).optional().describe('Tags to add to the ticket'),
      removeTags: z.array(z.string()).optional().describe('Tags to remove from the ticket'),
      addFollowers: z.array(z.string()).optional().describe('Agent IDs to add as followers'),
      removeFollowers: z
        .array(z.string())
        .optional()
        .describe('Agent IDs to remove from followers'),
      moveToSilo: z
        .enum(['tickets', 'archive', 'spam', 'trash'])
        .optional()
        .describe('Move the ticket to a different silo')
    })
  )
  .output(
    z.object({
      ticket: ticketSchema.describe(
        'The updated ticket after all operations have been applied'
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { ticketId } = ctx.input;
    let actions: string[] = [];

    // Build core update payload if any core fields are provided
    let hasUpdate =
      ctx.input.subject !== undefined ||
      ctx.input.status !== undefined ||
      ctx.input.priority !== undefined ||
      ctx.input.teamID !== undefined ||
      ctx.input.assigneeID !== undefined ||
      ctx.input.ccRecipients !== undefined ||
      ctx.input.customFields !== undefined;

    if (hasUpdate) {
      let updatePayload: Record<string, unknown> = {};
      if (ctx.input.subject !== undefined) updatePayload.subject = ctx.input.subject;
      if (ctx.input.status !== undefined) updatePayload.status = ctx.input.status;
      if (ctx.input.priority !== undefined) updatePayload.priority = ctx.input.priority;
      if (ctx.input.teamID !== undefined) updatePayload.teamID = ctx.input.teamID;
      if (ctx.input.assigneeID !== undefined) updatePayload.assigneeID = ctx.input.assigneeID;
      if (ctx.input.ccRecipients !== undefined)
        updatePayload.ccRecipients = ctx.input.ccRecipients;
      if (ctx.input.customFields !== undefined)
        updatePayload.customFields = ctx.input.customFields;

      await client.updateTicket(
        ticketId,
        updatePayload as Parameters<typeof client.updateTicket>[1]
      );
      actions.push('updated fields');
    }

    // Tag management
    if (ctx.input.addTags && ctx.input.addTags.length > 0) {
      await client.addTicketTags(ticketId, ctx.input.addTags);
      actions.push(`added ${ctx.input.addTags.length} tag(s)`);
    }

    if (ctx.input.removeTags && ctx.input.removeTags.length > 0) {
      await client.removeTicketTags(ticketId, ctx.input.removeTags);
      actions.push(`removed ${ctx.input.removeTags.length} tag(s)`);
    }

    // Follower management
    if (ctx.input.addFollowers && ctx.input.addFollowers.length > 0) {
      await client.addTicketFollowers(ticketId, ctx.input.addFollowers);
      actions.push(`added ${ctx.input.addFollowers.length} follower(s)`);
    }

    if (ctx.input.removeFollowers && ctx.input.removeFollowers.length > 0) {
      await client.removeTicketFollowers(ticketId, ctx.input.removeFollowers);
      actions.push(`removed ${ctx.input.removeFollowers.length} follower(s)`);
    }

    // Silo movement
    if (ctx.input.moveToSilo) {
      await client.moveTicketToSilo(ticketId, ctx.input.moveToSilo);
      actions.push(`moved to ${ctx.input.moveToSilo}`);
    }

    // Fetch the updated ticket to return the latest state
    let ticket = await client.getTicket(ticketId);

    let actionSummary = actions.length > 0 ? actions.join(', ') : 'no changes applied';

    return {
      output: {
        ticket
      },
      message: `Updated ticket **${ticket.shortID}**: ${actionSummary}.`
    };
  })
  .build();
