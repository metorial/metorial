import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZoomClient } from '../lib/client';
import { zoomServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageMeetingRegistrants = SlateTool.create(spec, {
  name: 'Manage Meeting Registrants',
  key: 'manage_meeting_registrants',
  description: `List existing registrants or add a new registrant to a Zoom meeting. When adding a registrant, provide their email and name. When listing, supports filtering by status and pagination.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      meetingId: z.union([z.string(), z.number()]).describe('The meeting ID'),
      action: z
        .enum(['list', 'add'])
        .describe('Action to perform: list registrants or add a new one'),
      registrant: z
        .object({
          email: z.string().describe('Registrant email address'),
          firstName: z.string().describe('Registrant first name'),
          lastName: z.string().optional().describe('Registrant last name'),
          address: z.string().optional().describe('Address'),
          city: z.string().optional().describe('City'),
          state: z.string().optional().describe('State'),
          zip: z.string().optional().describe('Zip code'),
          country: z.string().optional().describe('Country'),
          phone: z.string().optional().describe('Phone number'),
          industry: z.string().optional().describe('Industry'),
          org: z.string().optional().describe('Organization'),
          jobTitle: z.string().optional().describe('Job title'),
          comments: z.string().optional().describe('Comments'),
          noOfEmployees: z.string().optional().describe('Number of employees'),
          purchasingTimeFrame: z.string().optional().describe('Purchasing timeframe'),
          roleInPurchaseProcess: z.string().optional().describe('Role in purchase process'),
          customQuestions: z
            .array(
              z.object({
                title: z.string().describe('Custom registration question title'),
                value: z.string().max(128).describe('Custom registration question answer')
              })
            )
            .optional()
            .describe('Responses to custom registration questions')
        })
        .optional()
        .describe('Registrant details (required when action is "add")'),
      status: z
        .enum(['approved', 'pending', 'denied'])
        .optional()
        .describe('Filter by registration status (for listing)'),
      pageSize: z.number().optional().describe('Number of records per page'),
      nextPageToken: z.string().optional().describe('Pagination token')
    })
  )
  .output(
    z.object({
      registrantId: z.string().optional().describe('New registrant ID (when adding)'),
      registrantUrl: z
        .string()
        .optional()
        .describe('Unique join URL for the registrant (when adding)'),
      participantPinCode: z.number().optional().describe('Audio participant PIN code'),
      totalRecords: z
        .number()
        .optional()
        .describe('Total number of registrants (when listing)'),
      nextPageToken: z.string().optional().describe('Token for next page (when listing)'),
      registrants: z
        .array(
          z.object({
            odataRegistrantId: z.string().optional().describe('Registrant ID'),
            email: z.string().describe('Email'),
            firstName: z.string().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            status: z.string().optional().describe('Registration status'),
            createTime: z.string().optional().describe('Registration time'),
            joinUrl: z.string().optional().describe('Unique join URL'),
            phone: z.string().optional().describe('Phone number'),
            industry: z.string().optional().describe('Industry'),
            org: z.string().optional().describe('Organization'),
            jobTitle: z.string().optional().describe('Job title'),
            customQuestions: z.any().optional().describe('Custom registration answers')
          })
        )
        .optional()
        .describe('List of registrants (when listing)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZoomClient(ctx.auth.token);

    if (ctx.input.action === 'add') {
      if (!ctx.input.registrant) {
        throw zoomServiceError('Registrant details are required when adding a new registrant');
      }

      let result = await client.addMeetingRegistrant(ctx.input.meetingId, {
        email: ctx.input.registrant.email,
        first_name: ctx.input.registrant.firstName,
        last_name: ctx.input.registrant.lastName,
        address: ctx.input.registrant.address,
        city: ctx.input.registrant.city,
        state: ctx.input.registrant.state,
        zip: ctx.input.registrant.zip,
        country: ctx.input.registrant.country,
        phone: ctx.input.registrant.phone,
        industry: ctx.input.registrant.industry,
        org: ctx.input.registrant.org,
        job_title: ctx.input.registrant.jobTitle,
        comments: ctx.input.registrant.comments,
        no_of_employees: ctx.input.registrant.noOfEmployees,
        purchasing_time_frame: ctx.input.registrant.purchasingTimeFrame,
        role_in_purchase_process: ctx.input.registrant.roleInPurchaseProcess,
        custom_questions: ctx.input.registrant.customQuestions
      });

      return {
        output: {
          registrantId: result.registrant_id,
          registrantUrl: result.join_url,
          participantPinCode: result.participant_pin_code
        },
        message: `Registrant **${ctx.input.registrant.email}** added to meeting **${ctx.input.meetingId}**.`
      };
    }

    // List registrants
    let result = await client.listMeetingRegistrants(ctx.input.meetingId, {
      status: ctx.input.status,
      pageSize: ctx.input.pageSize,
      nextPageToken: ctx.input.nextPageToken
    });

    let registrants = (result.registrants || []).map((r: any) => ({
      odataRegistrantId: r.id,
      email: r.email,
      firstName: r.first_name,
      lastName: r.last_name,
      status: r.status,
      createTime: r.create_time,
      joinUrl: r.join_url,
      phone: r.phone,
      industry: r.industry,
      org: r.org,
      jobTitle: r.job_title,
      customQuestions: r.custom_questions
    }));

    return {
      output: {
        totalRecords: result.total_records,
        nextPageToken: result.next_page_token || undefined,
        registrants
      },
      message: `Found **${registrants.length}** registrant(s) for meeting **${ctx.input.meetingId}**.`
    };
  })
  .build();
