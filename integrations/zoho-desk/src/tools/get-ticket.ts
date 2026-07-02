import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getTicket = SlateTool.create(spec, {
  name: 'Get Ticket',
  key: 'get_ticket',
  description: `Retrieve a support ticket by its ID, including details like subject, description, status, priority, assignee, contact, threads, and comments. Optionally include related data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticketId: z.string().describe('ID of the ticket to retrieve'),
      include: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of related data to include (e.g., "contacts,assignee,departments,teams,products")'
        )
    })
  )
  .output(
    z.object({
      ticketId: z.string().describe('ID of the ticket'),
      ticketNumber: z.string().optional().describe('Ticket number'),
      subject: z.string().optional().describe('Subject of the ticket'),
      description: z.string().optional().describe('Description of the ticket'),
      status: z.string().optional().describe('Status of the ticket'),
      priority: z.string().optional().describe('Priority of the ticket'),
      channel: z.string().optional().describe('Channel of the ticket'),
      category: z.string().optional().describe('Category of the ticket'),
      subCategory: z.string().optional().describe('Sub-category of the ticket'),
      assigneeId: z.string().optional().describe('Assigned agent ID'),
      contactId: z.string().optional().describe('Contact ID of the requester'),
      departmentId: z.string().optional().describe('Department ID'),
      dueDate: z.string().optional().describe('Due date'),
      createdTime: z.string().optional().describe('Ticket creation time'),
      modifiedTime: z.string().optional().describe('Last modification time'),
      webUrl: z.string().optional().describe('URL to view the ticket'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.getTicket(ctx.input.ticketId, {
      include: ctx.input.include
    });

    return {
      output: {
        ticketId: result.id,
        ticketNumber: result.ticketNumber,
        subject: result.subject,
        description: result.description,
        status: result.status,
        priority: result.priority,
        channel: result.channel,
        category: result.category,
        subCategory: result.subCategory,
        assigneeId: result.assigneeId,
        contactId: result.contactId,
        departmentId: result.departmentId,
        dueDate: result.dueDate,
        createdTime: result.createdTime,
        modifiedTime: result.modifiedTime,
        webUrl: result.webUrl,
        customFields: result.cf
      },
      message: `Retrieved ticket **#${result.ticketNumber || result.id}**: "${result.subject}" (${result.status})`
    };
  })
  .build();
