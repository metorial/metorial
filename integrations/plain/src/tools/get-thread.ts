import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getThread = SlateTool.create(spec, {
  name: 'Get Thread',
  key: 'get_thread',
  description: `Retrieve a single support thread by ID. Returns full thread details including status, priority, labels, assignee, and associated customer/tenant information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      threadId: z.string().describe('Plain thread ID')
    })
  )
  .output(
    z.object({
      threadId: z.string().describe('Plain thread ID'),
      ref: z.string().nullable().describe('Thread reference number'),
      externalId: z.string().nullable().describe('External thread ID'),
      customerId: z.string().describe('Customer ID'),
      title: z.string().nullable().describe('Thread title'),
      description: z.string().nullable().describe('Thread description'),
      previewText: z.string().nullable().describe('Preview text'),
      status: z.string().describe('Thread status (Todo, Snoozed, Done)'),
      priority: z.number().describe('Priority level'),
      tenantId: z.string().nullable().describe('Tenant ID'),
      tenantName: z.string().nullable().describe('Tenant name'),
      labels: z.array(
        z.object({
          labelId: z.string().describe('Label ID'),
          labelTypeName: z.string().describe('Label type name')
        })
      ),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      updatedAt: z.string().describe('ISO 8601 last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let thread = await client.getThread(ctx.input.threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }

    return {
      output: {
        threadId: thread.id,
        ref: thread.ref,
        externalId: thread.externalId,
        customerId: thread.customer?.id,
        title: thread.title,
        description: thread.description,
        previewText: thread.previewText,
        status: thread.status,
        priority: thread.priority,
        tenantId: thread.tenant?.id ?? null,
        tenantName: thread.tenant?.name ?? null,
        labels: (thread.labels || []).map((l: any) => ({
          labelId: l.id,
          labelTypeName: l.labelType?.name ?? ''
        })),
        createdAt: thread.createdAt?.iso8601,
        updatedAt: thread.updatedAt?.iso8601
      },
      message: `Thread **${thread.title || thread.id}** — status: **${thread.status}**, priority: **${thread.priority}**`
    };
  })
  .build();
