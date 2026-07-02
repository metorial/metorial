import { SlateTool } from 'slates';
import { z } from 'zod';
import { TaveLeadClient } from '../lib/client';
import { spec } from '../spec';

export let createLead = SlateTool.create(spec, {
  name: 'Create Lead',
  key: 'create_lead',
  description: `Creates a new lead in Tave from an external source such as a website contact form. Requires the **New Lead API (Legacy)** authentication method with Secret Key and Studio ID. The lead can include contact details, job information, and a message. The \`jobType\` must exactly match a Job Type configured in Tave settings.`,
  instructions: [
    'The jobType value must exactly match one of the Job Types configured in Tave settings (e.g., "Wedding", "Portrait").',
    'Requires the New Lead API (Legacy) authentication method — will not work with API Key auth.',
    'Any unrecognized field names sent via customFields will be created as custom fields in Tave.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      firstName: z.string().describe('First name of the lead contact'),
      lastName: z.string().optional().describe('Last name of the lead contact'),
      email: z.string().optional().describe('Email address of the lead contact'),
      homePhone: z.string().optional().describe('Home phone number'),
      mobilePhone: z.string().optional().describe('Mobile phone number'),
      workPhone: z.string().optional().describe('Work phone number'),
      jobType: z
        .string()
        .describe(
          'Type of job — must exactly match a Job Type in Tave settings (e.g., "Wedding", "Portrait")'
        ),
      jobRole: z
        .string()
        .optional()
        .describe('Role of the contact for the job (e.g., "Bride", "Groom")'),
      brand: z.string().optional().describe('Brand to associate the lead with'),
      source: z.string().optional().describe('How the lead heard about you (referral source)'),
      eventDate: z.string().optional().describe('Date of the event (e.g., "2026-06-15")'),
      message: z.string().optional().describe('Message or inquiry notes from the lead'),
      suppressEmailNotification: z
        .boolean()
        .optional()
        .describe('If true, suppresses the email notification for this lead'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Custom fields as key-value pairs. Keys should be the field codes from Tave settings (e.g., "CF-12345").'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the lead was created successfully'),
      response: z.any().optional().describe('Raw response from the Tave API')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.secretKey || !ctx.auth.studioId) {
      throw new Error(
        'New Lead API requires Secret Key and Studio ID authentication. Please use the "New Lead API (Legacy)" auth method.'
      );
    }

    let client = new TaveLeadClient(ctx.auth.secretKey, ctx.auth.studioId);

    let leadData: Record<string, unknown> = {
      FirstName: ctx.input.firstName,
      JobType: ctx.input.jobType
    };

    if (ctx.input.lastName) leadData.LastName = ctx.input.lastName;
    if (ctx.input.email) leadData.Email = ctx.input.email;
    if (ctx.input.homePhone) leadData.HomePhone = ctx.input.homePhone;
    if (ctx.input.mobilePhone) leadData.MobilePhone = ctx.input.mobilePhone;
    if (ctx.input.workPhone) leadData.WorkPhone = ctx.input.workPhone;
    if (ctx.input.jobRole) leadData.JobRole = ctx.input.jobRole;
    if (ctx.input.brand) leadData.Brand = ctx.input.brand;
    if (ctx.input.source) leadData.Source = ctx.input.source;
    if (ctx.input.eventDate) leadData.EventDate = ctx.input.eventDate;
    if (ctx.input.message) leadData.Message = ctx.input.message;

    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        leadData[key] = value;
      }
    }

    ctx.info({
      message: 'Creating lead in Tave',
      firstName: ctx.input.firstName,
      jobType: ctx.input.jobType
    });

    let response = await client.createLead(leadData);

    return {
      output: {
        success: true,
        response
      },
      message: `Successfully created lead for **${ctx.input.firstName}${ctx.input.lastName ? ` ${ctx.input.lastName}` : ''}** with job type **${ctx.input.jobType}**.`
    };
  })
  .build();
