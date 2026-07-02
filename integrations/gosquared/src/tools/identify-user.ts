import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoSquaredClient } from '../lib/client';
import { spec } from '../spec';

export let identifyUser = SlateTool.create(spec, {
  name: 'Identify User',
  key: 'identify_user',
  description: `Create or update a user profile in GoSquared People CRM. Associates a person with profile properties like name, email, phone, company info, and custom properties. Use this to import user profiles or update existing ones.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      personId: z
        .string()
        .describe(
          'Unique identifier for the person. Use "email:user@example.com" format for email-based identification.'
        ),
      name: z.string().optional().describe('Full name of the user'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      username: z.string().optional().describe('Username'),
      createdAt: z.string().optional().describe('Account creation date in ISO 8601 format'),
      companyName: z.string().optional().describe('Company name'),
      companyIndustry: z.string().optional().describe('Company industry'),
      companySize: z.number().optional().describe('Company size'),
      customProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom properties to set on the user profile')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the identification was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoSquaredClient({
      token: ctx.auth.token,
      siteToken: ctx.config.siteToken
    });

    let properties: Record<string, any> = {};
    if (ctx.input.name) properties.name = ctx.input.name;
    if (ctx.input.email) properties.email = ctx.input.email;
    if (ctx.input.phone) properties.phone = ctx.input.phone;
    if (ctx.input.username) properties.username = ctx.input.username;
    if (ctx.input.createdAt) properties.created_at = ctx.input.createdAt;
    if (ctx.input.companyName) properties.company_name = ctx.input.companyName;
    if (ctx.input.companyIndustry) properties.company_industry = ctx.input.companyIndustry;
    if (ctx.input.companySize !== undefined) properties.company_size = ctx.input.companySize;
    if (ctx.input.customProperties) properties.custom = ctx.input.customProperties;

    await client.identify(ctx.input.personId, properties);

    return {
      output: { success: true },
      message: `Successfully identified user **${ctx.input.personId}**.`
    };
  })
  .build();
