import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let verificationCompleted = SlateTrigger.create(spec, {
  name: 'Verification Completed',
  key: 'verification_completed',
  description:
    'Triggered when an identity verification, AML screening, or other check is completed. Delivers the verification outcome (positive or negative) and associated details in real time via webhook.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of event (e.g., verification.completed, aml_screening.completed)'),
      eventId: z.string().describe('Unique ID of this event'),
      checkId: z.string().describe('ID of the completed check'),
      checkType: z.string().describe('Type of check completed'),
      status: z.string().describe('Status of the check'),
      outcome: z.string().optional().describe('Outcome of the check (positive or negative)'),
      email: z.string().optional().describe('Email of the verified individual'),
      firstName: z.string().optional().describe('First name from the identity document'),
      lastName: z.string().optional().describe('Last name from the identity document'),
      dateOfBirth: z.string().optional().describe('Date of birth from the identity document'),
      documentType: z.string().optional().describe('Type of identity document used'),
      documentCountry: z.string().optional().describe('Country of the identity document'),
      matchesFound: z.boolean().optional().describe('Whether AML matches were found'),
      reportUrl: z.string().optional().describe('URL to the detailed report'),
      referenceId: z.string().optional().describe('Reference ID if provided during creation'),
      completedAt: z.string().optional().describe('Timestamp of completion')
    })
  )
  .output(
    z.object({
      checkId: z.string().describe('ID of the completed check'),
      checkType: z
        .string()
        .describe(
          'Type of check (verification, aml_screening, proof_of_address, background_check, credit_check, kyb_report)'
        ),
      status: z.string().describe('Final status of the check'),
      outcome: z.string().optional().describe('Outcome of the check (positive or negative)'),
      email: z.string().optional().describe('Email of the verified individual'),
      firstName: z.string().optional().describe('First name from the identity document'),
      lastName: z.string().optional().describe('Last name from the identity document'),
      dateOfBirth: z.string().optional().describe('Date of birth from the identity document'),
      documentType: z.string().optional().describe('Type of identity document used'),
      documentCountry: z.string().optional().describe('Country of the identity document'),
      matchesFound: z.boolean().optional().describe('Whether AML matches were found'),
      reportUrl: z.string().optional().describe('URL to the detailed report'),
      referenceId: z.string().optional().describe('Reference ID if provided during creation'),
      completedAt: z.string().optional().describe('Timestamp when the check was completed')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let contentType = ctx.request.headers.get('content-type') || '';

      if (ctx.request.method === 'GET') {
        return { inputs: [] };
      }

      let data: any;
      if (contentType.includes('application/json')) {
        data = await ctx.request.json();
      } else {
        let text = await ctx.request.text();
        try {
          data = JSON.parse(text);
        } catch {
          return { inputs: [] };
        }
      }

      if (!data) {
        return { inputs: [] };
      }

      // Handle both single event and array of events
      let events = Array.isArray(data) ? data : [data];

      let deriveCheckType = (eventType: string): string => {
        if (eventType.includes('aml') || eventType.includes('screening'))
          return 'aml_screening';
        if (eventType.includes('proof') || eventType.includes('address'))
          return 'proof_of_address';
        if (eventType.includes('background')) return 'background_check';
        if (eventType.includes('credit')) return 'credit_check';
        if (eventType.includes('kyb') || eventType.includes('business')) return 'kyb_report';
        return 'verification';
      };

      let inputs = events.map((event: any) => {
        let eventType =
          event.event_type || event.type || event.event || 'verification.completed';
        let checkData = event.data || event.payload || event;

        return {
          eventType,
          eventId:
            event.event_id ||
            event.id ||
            `${checkData.id || checkData.check_id || 'unknown'}_${Date.now()}`,
          checkId:
            checkData.id ||
            checkData.check_id ||
            checkData.verification_id ||
            checkData.screening_id ||
            checkData.report_id ||
            '',
          checkType: checkData.check_type || checkData.type || deriveCheckType(eventType),
          status: checkData.status || 'completed',
          outcome: checkData.outcome || checkData.result,
          email: checkData.email,
          firstName: checkData.first_name,
          lastName: checkData.last_name,
          dateOfBirth: checkData.date_of_birth,
          documentType: checkData.document_type,
          documentCountry: checkData.document_country,
          matchesFound: checkData.matches_found,
          reportUrl: checkData.report_url,
          referenceId: checkData.reference_id,
          completedAt: checkData.completed_at
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          checkId: ctx.input.checkId,
          checkType: ctx.input.checkType,
          status: ctx.input.status,
          outcome: ctx.input.outcome,
          email: ctx.input.email,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          dateOfBirth: ctx.input.dateOfBirth,
          documentType: ctx.input.documentType,
          documentCountry: ctx.input.documentCountry,
          matchesFound: ctx.input.matchesFound,
          reportUrl: ctx.input.reportUrl,
          referenceId: ctx.input.referenceId,
          completedAt: ctx.input.completedAt
        }
      };
    }
  })
  .build();
