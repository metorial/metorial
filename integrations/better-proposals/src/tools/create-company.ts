import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCompany = SlateTool.create(spec, {
  name: 'Create Company',
  key: 'create_company',
  description:
    'Creates a client company and returns its provider data for use in proposals and quotes.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      companyName: z.string().describe('Name of the client company')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API'),
      company: z.any().describe('Created company data')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).createCompany(
      ctx.input.companyName
    );
    return {
      output: { status: result.status, company: result.data },
      message: `Created company **${ctx.input.companyName}**.`
    };
  })
  .build();
