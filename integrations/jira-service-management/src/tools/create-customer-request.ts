import { SlateTool } from 'slates';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let createCustomerRequestTool = SlateTool.create(spec, {
  name: 'Create Customer Request',
  key: 'create_customer_request',
  description: `Create a new customer request (service desk ticket) in a JSM service desk. Requires a service desk ID and request type ID. The request can optionally be raised on behalf of a customer.`,
  instructions: [
    'Use the List Request Types tool to discover available request types and their required fields for a given service desk.',
    'The requestFieldValues object should contain the field values required by the chosen request type.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      serviceDeskId: z.string().describe('ID of the service desk to create the request in'),
      requestTypeId: z.string().describe('ID of the request type to use'),
      requestFieldValues: z
        .record(z.string(), z.any())
        .describe(
          'Field values for the request (e.g., { "summary": "...", "description": "..." })'
        ),
      raiseOnBehalfOf: z
        .string()
        .optional()
        .describe('Account ID of the customer to raise the request on behalf of'),
      requestParticipants: z
        .array(z.string())
        .optional()
        .describe('Account IDs to add as request participants')
    })
  )
  .output(
    z.object({
      issueId: z.string().describe('Unique ID of the created request'),
      issueKey: z.string().describe('Human-readable issue key'),
      currentStatus: z.string().optional().describe('Current status of the request'),
      reporter: z.string().optional().describe('Display name of the reporter'),
      requestTypeId: z.string().optional().describe('Request type ID used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId
    });

    let body: any = {
      serviceDeskId: ctx.input.serviceDeskId,
      requestTypeId: ctx.input.requestTypeId,
      requestFieldValues: ctx.input.requestFieldValues
    };

    if (ctx.input.raiseOnBehalfOf) {
      body.raiseOnBehalfOf = ctx.input.raiseOnBehalfOf;
    }

    if (ctx.input.requestParticipants) {
      body.requestParticipants = ctx.input.requestParticipants;
    }

    let result = await client.createCustomerRequest(body);

    return {
      output: {
        issueId: result.issueId,
        issueKey: result.issueKey,
        currentStatus: result.currentStatus?.status,
        reporter: result.reporter?.displayName,
        requestTypeId: result.requestTypeId
      },
      message: `Created customer request **${result.issueKey}** in service desk ${ctx.input.serviceDeskId}.`
    };
  })
  .build();
