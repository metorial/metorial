import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getConversation = SlateTool.create(spec, {
  name: 'Get Conversation',
  key: 'get_conversation',
  description: `Retrieve full details of a specific conversation by its session ID, including metadata, state, routing, messages preview, and visitor information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('The session ID of the conversation')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Session ID'),
      state: z
        .string()
        .optional()
        .describe('Conversation state: pending, unresolved, or resolved'),
      isBlocked: z.boolean().optional(),
      isVerified: z.boolean().optional(),
      availability: z.string().optional().describe('Visitor availability (online/offline)'),
      nickname: z.string().optional().describe('Visitor nickname'),
      email: z.string().optional().describe('Visitor email'),
      phone: z.string().optional().describe('Visitor phone'),
      address: z.string().optional().describe('Visitor address'),
      subject: z.string().optional().describe('Conversation subject'),
      avatar: z.string().optional().describe('Visitor avatar URL'),
      segments: z.array(z.string()).optional().describe('Conversation segments/tags'),
      customData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom data key-value pairs'),
      assignedOperatorId: z.string().optional().describe('Assigned operator user ID'),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, websiteId: ctx.config.websiteId });
    let c = await client.getConversation(ctx.input.sessionId);

    return {
      output: {
        sessionId: c.session_id,
        state: c.state,
        isBlocked: c.is_blocked,
        isVerified: c.is_verified,
        availability: c.availability,
        nickname: c.meta?.nickname,
        email: c.meta?.email,
        phone: c.meta?.phone,
        address: c.meta?.address,
        subject: c.meta?.subject,
        avatar: c.meta?.avatar,
        segments: c.meta?.segments,
        customData: c.meta?.data,
        assignedOperatorId: c.assigned?.user_id,
        createdAt: c.created_at ? String(c.created_at) : undefined,
        updatedAt: c.updated_at ? String(c.updated_at) : undefined
      },
      message: `Retrieved conversation **${ctx.input.sessionId}**${c.meta?.nickname ? ` with **${c.meta.nickname}**` : ''} (state: ${c.state}).`
    };
  })
  .build();
