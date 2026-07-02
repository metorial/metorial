import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let componentSchema = z
  .object({
    componentText: z
      .object({
        text: z.string().describe('Text content')
      })
      .optional()
      .describe('A text component'),
    componentSpacer: z
      .object({
        spacerSize: z.enum(['XS', 'S', 'M', 'L', 'XL']).describe('Size of the spacer')
      })
      .optional()
      .describe('A vertical spacer component'),
    componentLinkButton: z
      .object({
        linkButtonLabel: z.string().describe('Button label'),
        linkButtonUrl: z.string().describe('Button URL')
      })
      .optional()
      .describe('A link button component')
  })
  .describe('A UI component for the thread message');

export let createThread = SlateTool.create(spec, {
  name: 'Create Thread',
  key: 'create_thread',
  description: `Create a new support thread for a customer. Threads represent customer conversations and are created with an initial message composed of UI components (text, spacers, link buttons). You can optionally assign a tenant, labels, and priority.`,
  instructions: [
    'The customerId is required — obtain it from the upsert_customer or get_customer tools.',
    'Components define the initial message content. At minimum, include a componentText.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Thread title'),
      description: z.string().optional().describe('Thread description/preview text'),
      customerId: z.string().describe('Plain customer ID'),
      components: z.array(componentSchema).describe('UI components for the initial message'),
      priority: z
        .number()
        .optional()
        .describe('Priority level (0=urgent, 1=high, 2=normal, 3=low)'),
      labelTypeIds: z.array(z.string()).optional().describe('Label type IDs to apply'),
      tenantIdentifier: z
        .object({
          tenantId: z.string().optional().describe('Plain tenant ID'),
          externalId: z.string().optional().describe('External tenant ID')
        })
        .optional()
        .describe('Tenant to associate with the thread'),
      externalId: z.string().optional().describe('External ID for idempotency/correlation')
    })
  )
  .output(
    z.object({
      threadId: z.string().describe('Plain thread ID'),
      title: z.string().nullable().describe('Thread title'),
      status: z.string().describe('Thread status'),
      priority: z.number().describe('Thread priority'),
      createdAt: z.string().describe('ISO 8601 creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let input: any = {
      title: ctx.input.title,
      description: ctx.input.description,
      customerIdentifier: { customerId: ctx.input.customerId },
      components: ctx.input.components
    };

    if (ctx.input.priority !== undefined) {
      input.priority = ctx.input.priority;
    }
    if (ctx.input.labelTypeIds) {
      input.labelTypeIds = ctx.input.labelTypeIds;
    }
    if (ctx.input.tenantIdentifier) {
      input.tenantIdentifier = ctx.input.tenantIdentifier;
    }
    if (ctx.input.externalId) {
      input.externalId = ctx.input.externalId;
    }

    let res = await client.createThread(input);
    let thread = res.thread;

    return {
      output: {
        threadId: thread.id,
        title: thread.title,
        status: thread.status,
        priority: thread.priority,
        createdAt: thread.createdAt?.iso8601
      },
      message: `Created thread **${thread.title || thread.id}** with status **${thread.status}**`
    };
  })
  .build();
