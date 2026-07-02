import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let createLead = SlateTool.create(spec, {
  name: 'Create Lead',
  key: 'create_lead',
  description: `Capture a lead from a chatbot interaction. Stores contact details (name, email, phone) associated with a chatflow and chat conversation.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      chatflowId: z.string().describe('ID of the chatflow the lead is from'),
      chatId: z.string().describe('Chat conversation ID'),
      name: z.string().optional().describe('Lead contact name'),
      email: z.string().optional().describe('Lead email address'),
      phone: z.string().optional().describe('Lead phone number')
    })
  )
  .output(
    z.object({
      leadId: z.string().describe('ID of the created lead'),
      chatflowId: z.string().optional().describe('Associated chatflow ID'),
      chatId: z.string().optional().describe('Associated chat conversation ID'),
      name: z.string().optional().nullable().describe('Lead name'),
      email: z.string().optional().nullable().describe('Lead email'),
      phone: z.string().optional().nullable().describe('Lead phone'),
      createdDate: z.string().optional().describe('ISO 8601 creation date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.createLead({
      chatflowid: ctx.input.chatflowId,
      chatId: ctx.input.chatId,
      name: ctx.input.name,
      email: ctx.input.email,
      phone: ctx.input.phone
    });

    return {
      output: {
        leadId: result.id,
        chatflowId: result.chatflowid,
        chatId: result.chatId,
        name: result.name,
        email: result.email,
        phone: result.phone,
        createdDate: result.createdDate
      },
      message: `Created lead \`${result.id}\`${result.email ? ` for ${result.email}` : ''}.`
    };
  })
  .build();
