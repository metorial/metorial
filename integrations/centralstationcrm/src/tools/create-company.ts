import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCompany = SlateTool.create(spec, {
  name: 'Create Company',
  key: 'create_company',
  description: `Create a new company (organization) in CentralStationCRM. Optionally assign a responsible user and set background information.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      companyName: z.string().describe('Name of the company'),
      background: z.string().optional().describe('Background information about the company'),
      responsibleUserId: z
        .number()
        .optional()
        .describe('ID of the user responsible for this company')
    })
  )
  .output(
    z.object({
      companyId: z.number().describe('ID of the created company'),
      companyName: z.string().optional().describe('Name of the company'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let result = await client.createCompany({
      name: ctx.input.companyName,
      background: ctx.input.background,
      user_id: ctx.input.responsibleUserId
    });

    let company = result?.company ?? result;

    return {
      output: {
        companyId: company.id,
        companyName: company.name,
        createdAt: company.created_at
      },
      message: `Created company **${ctx.input.companyName}** (ID: ${company.id}).`
    };
  })
  .build();
