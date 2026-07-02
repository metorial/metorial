import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTicket = SlateTool.create(spec, {
  name: 'Get Ticket',
  key: 'get_ticket',
  description: `Retrieve a single ticket by its ID, including optional embedded resources like conversations, requester info, stats, or problem/change associations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ticketId: z.number().describe('ID of the ticket to retrieve'),
      include: z
        .string()
        .optional()
        .describe(
          'Comma-separated embedded resources: conversations, requester, stats, problem, assets, change, related_tickets'
        )
    })
  )
  .output(
    z.object({
      ticketId: z.number().describe('ID of the ticket'),
      subject: z.string().describe('Subject of the ticket'),
      description: z.string().nullable().describe('HTML description of the ticket'),
      descriptionText: z.string().nullable().describe('Plain text description'),
      status: z.number().describe('Status of the ticket'),
      priority: z.number().describe('Priority of the ticket'),
      type: z.string().nullable().describe('Type of the ticket'),
      source: z.number().describe('Source of the ticket'),
      requesterId: z.number().describe('ID of the requester'),
      agentId: z.number().nullable().describe('ID of the assigned agent'),
      groupId: z.number().nullable().describe('ID of the assigned group'),
      departmentId: z.number().nullable().describe('ID of the department'),
      category: z.string().nullable().describe('Category of the ticket'),
      subCategory: z.string().nullable().describe('Sub-category'),
      itemCategory: z.string().nullable().describe('Item category'),
      urgency: z.number().nullable().describe('Urgency level'),
      impact: z.number().nullable().describe('Impact level'),
      tags: z.array(z.string()).describe('Tags'),
      dueBy: z.string().nullable().describe('Due date'),
      frDueBy: z.string().nullable().describe('First response due date'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      customFields: z.record(z.string(), z.unknown()).nullable().describe('Custom fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let ticket = await client.getTicket(ctx.input.ticketId, ctx.input.include);

    return {
      output: {
        ticketId: ticket.id,
        subject: ticket.subject,
        description: ticket.description,
        descriptionText: ticket.description_text,
        status: ticket.status,
        priority: ticket.priority,
        type: ticket.type,
        source: ticket.source,
        requesterId: ticket.requester_id,
        agentId: ticket.responder_id,
        groupId: ticket.group_id,
        departmentId: ticket.department_id,
        category: ticket.category,
        subCategory: ticket.sub_category,
        itemCategory: ticket.item_category,
        urgency: ticket.urgency,
        impact: ticket.impact,
        tags: ticket.tags || [],
        dueBy: ticket.due_by,
        frDueBy: ticket.fr_due_by,
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
        customFields: ticket.custom_fields
      },
      message: `Retrieved ticket **#${ticket.id}**: "${ticket.subject}" (Status: ${ticket.status}, Priority: ${ticket.priority})`
    };
  })
  .build();
