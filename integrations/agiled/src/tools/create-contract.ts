import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContract = SlateTool.create(spec, {
  name: 'Create Contract',
  key: 'create_contract',
  description: `Create a new contract in Agiled. Define the subject, client, value, dates, and contract type. Contracts can be shared with recipients for e-signature.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subject: z.string().describe('Contract subject/title'),
      clientId: z.string().describe('ID of the client for the contract'),
      startDate: z.string().optional().describe('Contract start date (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('Contract end date (YYYY-MM-DD)'),
      contractValue: z.number().optional().describe('Monetary value of the contract'),
      contractTypeId: z.string().optional().describe('Contract type ID'),
      description: z.string().optional().describe('Contract description or body')
    })
  )
  .output(
    z.object({
      contractId: z.string().describe('ID of the created contract'),
      subject: z.string().describe('Contract subject')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    let result = await client.createContract({
      subject: ctx.input.subject,
      client_id: ctx.input.clientId,
      start_date: ctx.input.startDate,
      end_date: ctx.input.endDate,
      original_amount: ctx.input.contractValue,
      contract_type_id: ctx.input.contractTypeId,
      description: ctx.input.description
    });

    let contract = result.data;

    return {
      output: {
        contractId: String(contract.id ?? ''),
        subject: String(contract.subject ?? ctx.input.subject)
      },
      message: `Created contract **${ctx.input.subject}** for client **${ctx.input.clientId}**.`
    };
  })
  .build();
