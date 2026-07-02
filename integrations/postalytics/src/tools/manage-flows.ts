import { SlateTool } from 'slates';
import { z } from 'zod';
import { PostalyticsClient } from '../lib/client';
import { spec } from '../spec';

export let manageFlows = SlateTool.create(spec, {
  name: 'Manage Flows',
  key: 'manage_flows',
  description: `List campaign flows and enroll or unenroll contacts from multi-step direct mail sequences. Flows automate multi-touch mail drops with timing and branching logic.`,
  instructions: [
    'Use action "list" to see all available flows.',
    'Use action "enroll" to add a contact to a flow using the flow endpoint identifier.',
    'Use action "unenroll" to remove a contact from a flow using the flow endpoint and data ID.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'enroll', 'unenroll']).describe('The action to perform'),
      flowEndpoint: z
        .string()
        .optional()
        .describe('Flow endpoint identifier (required for enroll, unenroll)'),
      dataId: z
        .string()
        .optional()
        .describe('Contact data ID to unenroll (required for unenroll)'),
      recipient: z
        .object({
          firstName: z.string().describe('Recipient first name'),
          lastName: z.string().describe('Recipient last name'),
          company: z.string().optional().describe('Company name'),
          addressStreet: z.string().describe('Street address line 1'),
          addressStreet2: z.string().optional().describe('Street address line 2'),
          addressCity: z.string().describe('City'),
          addressState: z.string().describe('State abbreviation'),
          addressZip: z.string().describe('ZIP code'),
          country: z.string().optional().describe('Country (US or CA)'),
          varField1: z.string().optional().describe('Custom variable field 1'),
          varField2: z.string().optional().describe('Custom variable field 2'),
          varField3: z.string().optional().describe('Custom variable field 3'),
          varField4: z.string().optional().describe('Custom variable field 4'),
          varField5: z.string().optional().describe('Custom variable field 5'),
          varField6: z.string().optional().describe('Custom variable field 6'),
          varField7: z.string().optional().describe('Custom variable field 7'),
          varField8: z.string().optional().describe('Custom variable field 8'),
          varField9: z.string().optional().describe('Custom variable field 9'),
          varField10: z.string().optional().describe('Custom variable field 10')
        })
        .optional()
        .describe('Recipient contact information (required for enroll action)')
    })
  )
  .output(
    z.object({
      flows: z.array(z.record(z.string(), z.unknown())).optional().describe('Array of flows'),
      result: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Enrollment/unenrollment result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PostalyticsClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let { action } = ctx.input;

    if (action === 'list') {
      let flows = await client.getFlows();
      return {
        output: { flows },
        message: `Found **${flows.length}** flow(s).`
      };
    }

    if (action === 'enroll') {
      if (!ctx.input.flowEndpoint)
        throw new Error('flowEndpoint is required for enroll action');
      if (!ctx.input.recipient) throw new Error('recipient is required for enroll action');
      let result = await client.enrollContactInFlow(
        ctx.input.flowEndpoint,
        ctx.input.recipient
      );
      return {
        output: { result },
        message: `Contact **${ctx.input.recipient.firstName} ${ctx.input.recipient.lastName}** enrolled in flow.`
      };
    }

    if (action === 'unenroll') {
      if (!ctx.input.flowEndpoint)
        throw new Error('flowEndpoint is required for unenroll action');
      if (!ctx.input.dataId) throw new Error('dataId is required for unenroll action');
      let result = await client.unenrollContactFromFlow(
        ctx.input.flowEndpoint,
        ctx.input.dataId
      );
      return {
        output: { result },
        message: `Contact **${ctx.input.dataId}** unenrolled from flow.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
