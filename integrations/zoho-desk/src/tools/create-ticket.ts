import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createTicket = SlateTool.create(spec, {
  name: 'Create Ticket',
  key: 'create_ticket',
  description: `Create a new support ticket in Zoho Desk. Supports setting subject, description, contact, department, priority, status, assignee, due date, category, channel, and custom fields.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subject: z.string().describe('Subject/title of the ticket'),
      description: z
        .string()
        .optional()
        .describe('Detailed description of the ticket (HTML supported)'),
      departmentId: z.string().optional().describe('Department ID to assign the ticket to'),
      contactId: z.string().optional().describe('Contact ID of the requester'),
      email: z
        .string()
        .optional()
        .describe('Email of the requester (used if contactId is not provided)'),
      phone: z.string().optional().describe('Phone number of the requester'),
      priority: z
        .string()
        .optional()
        .describe('Priority level (e.g., Low, Medium, High, Urgent)'),
      status: z
        .string()
        .optional()
        .describe('Ticket status (e.g., Open, On Hold, Escalated, Closed)'),
      assigneeId: z.string().optional().describe('Agent ID to assign the ticket to'),
      teamId: z.string().optional().describe('Team ID to assign the ticket to'),
      channel: z
        .string()
        .optional()
        .describe(
          'Channel through which the ticket was received (e.g., Email, Phone, Web, Chat)'
        ),
      category: z.string().optional().describe('Category of the ticket'),
      subCategory: z.string().optional().describe('Sub-category of the ticket'),
      dueDate: z
        .string()
        .optional()
        .describe('Due date in ISO format (e.g., 2024-01-15T10:00:00Z)'),
      productId: z.string().optional().describe('Product ID associated with the ticket'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values as key-value pairs')
    })
  )
  .output(
    z.object({
      ticketId: z.string().describe('ID of the created ticket'),
      ticketNumber: z.string().optional().describe('Ticket number'),
      subject: z.string().describe('Subject of the ticket'),
      status: z.string().optional().describe('Status of the ticket'),
      webUrl: z.string().optional().describe('URL to view the ticket in Zoho Desk')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let ticketData: Record<string, any> = {
      subject: ctx.input.subject
    };

    if (ctx.input.description) ticketData.description = ctx.input.description;
    if (ctx.input.departmentId) ticketData.departmentId = ctx.input.departmentId;
    if (ctx.input.contactId) ticketData.contactId = ctx.input.contactId;
    if (ctx.input.email) ticketData.email = ctx.input.email;
    if (ctx.input.phone) ticketData.phone = ctx.input.phone;
    if (ctx.input.priority) ticketData.priority = ctx.input.priority;
    if (ctx.input.status) ticketData.status = ctx.input.status;
    if (ctx.input.assigneeId) ticketData.assigneeId = ctx.input.assigneeId;
    if (ctx.input.teamId) ticketData.teamId = ctx.input.teamId;
    if (ctx.input.channel) ticketData.channel = ctx.input.channel;
    if (ctx.input.category) ticketData.category = ctx.input.category;
    if (ctx.input.subCategory) ticketData.subCategory = ctx.input.subCategory;
    if (ctx.input.dueDate) ticketData.dueDate = ctx.input.dueDate;
    if (ctx.input.productId) ticketData.productId = ctx.input.productId;
    if (ctx.input.customFields) ticketData.cf = ctx.input.customFields;

    let result = await client.createTicket(ticketData);

    return {
      output: {
        ticketId: result.id,
        ticketNumber: result.ticketNumber,
        subject: result.subject,
        status: result.status,
        webUrl: result.webUrl
      },
      message: `Created ticket **#${result.ticketNumber || result.id}**: "${result.subject}"`
    };
  })
  .build();
