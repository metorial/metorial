import { SlateTool } from 'slates';
import { z } from 'zod';
import { DetrackClient } from '../lib/client';
import { spec } from '../spec';

export let getJobTool = SlateTool.create(spec, {
  name: 'Get Job',
  key: 'get_job',
  description: `Retrieves the full details of a specific delivery or collection job including status, milestones, items, proof of delivery info, and all associated metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      doNumber: z.string().describe('Delivery order number of the job to retrieve'),
      date: z
        .string()
        .optional()
        .describe(
          'Job date in YYYY-MM-DD format. Required if multiple jobs share the same D.O. number across dates.'
        )
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('Detrack-assigned job ID'),
      doNumber: z.string().describe('Delivery order number'),
      date: z.string().describe('Job date'),
      type: z.string().optional().describe('Job type — Delivery or Collection'),
      status: z.string().optional().describe('Current job status'),
      trackingStatus: z.string().optional().describe('Customer-facing tracking status'),
      assignTo: z.string().optional().describe('Assigned driver/vehicle'),
      address: z.string().optional().describe('Job address'),
      deliverTo: z.string().optional().describe('Recipient/sender name'),
      companyName: z.string().optional().describe('Company name'),
      phone: z.string().optional().describe('Phone number'),
      trackingNumber: z.string().optional().describe('Tracking number'),
      orderNumber: z.string().optional().describe('Order number'),
      instructions: z.string().optional().describe('Driver instructions'),
      items: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of items on the job'),
      milestones: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Job milestone events'),
      podAt: z.string().optional().describe('Proof of delivery timestamp'),
      receivedBy: z.string().optional().describe('Name of person who received the delivery'),
      note: z.string().optional().describe('Driver note'),
      reason: z.string().optional().describe('Failure or exception reason'),
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full job response from Detrack')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DetrackClient(ctx.auth.token);

    let result = await client.getJob(ctx.input.doNumber, ctx.input.date);

    let items = Array.isArray(result.items)
      ? (result.items as Record<string, unknown>[])
      : undefined;
    let milestones = Array.isArray(result.milestones)
      ? (result.milestones as Record<string, unknown>[])
      : undefined;

    return {
      output: {
        jobId: result.id ? String(result.id) : undefined,
        doNumber: String(result.do_number ?? ctx.input.doNumber),
        date: String(result.date ?? ''),
        type: result.type ? String(result.type) : undefined,
        status: result.status ? String(result.status) : undefined,
        trackingStatus: result.tracking_status ? String(result.tracking_status) : undefined,
        assignTo: result.assign_to ? String(result.assign_to) : undefined,
        address: result.address ? String(result.address) : undefined,
        deliverTo: result.deliver_to_collect_from
          ? String(result.deliver_to_collect_from)
          : undefined,
        companyName: result.company_name ? String(result.company_name) : undefined,
        phone: result.phone ? String(result.phone) : undefined,
        trackingNumber: result.tracking_number ? String(result.tracking_number) : undefined,
        orderNumber: result.order_number ? String(result.order_number) : undefined,
        instructions: result.instructions ? String(result.instructions) : undefined,
        items,
        milestones,
        podAt: result.pod_at ? String(result.pod_at) : undefined,
        receivedBy: result.received_by ? String(result.received_by) : undefined,
        note: result.note ? String(result.note) : undefined,
        reason: result.reason ? String(result.reason) : undefined,
        raw: result
      },
      message: `Retrieved job **${ctx.input.doNumber}**${result.status ? ` (status: ${result.status})` : ''}.`
    };
  })
  .build();
