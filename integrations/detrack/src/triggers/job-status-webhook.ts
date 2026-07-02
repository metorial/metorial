import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let jobStatusWebhookTrigger = SlateTrigger.create(spec, {
  name: 'Job Status Update',
  key: 'job_status_update',
  description:
    'Triggers when a job status changes in Detrack. Covers all status updates including info received, scheduled, heading to, arrived, completed, partially completed, failed, and driver assignment changes. Configure the webhook URL in Detrack under Settings > Delivery or Collection > Webhook URL.',
  instructions: [
    'You must manually configure the webhook URL in your Detrack dashboard under Settings > Delivery or Collection.',
    'Select the trigger statuses you want to receive notifications for.',
    'You may also enable driver assignment change notifications independently.'
  ]
})
  .input(
    z.object({
      jobId: z.string().optional().describe('Detrack job ID'),
      doNumber: z.string().describe('Delivery order number'),
      date: z.string().describe('Job date'),
      status: z.string().describe('Current job status'),
      type: z.string().optional().describe('Job type — Delivery or Collection'),
      assignTo: z.string().optional().describe('Assigned driver/vehicle'),
      address: z.string().optional().describe('Job address'),
      trackingNumber: z.string().optional().describe('Tracking number'),
      deliverTo: z.string().optional().describe('Recipient/sender name'),
      etaTime: z.string().optional().describe('Estimated arrival time'),
      completedAt: z.string().optional().describe('Completion timestamp'),
      receivedBy: z.string().optional().describe('Person who received the delivery'),
      reason: z.string().optional().describe('Failure or exception reason'),
      note: z.string().optional().describe('Driver note'),
      milestones: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Job milestones'),
      raw: z.record(z.string(), z.unknown()).describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('Detrack job ID'),
      doNumber: z.string().describe('Delivery order number'),
      date: z.string().describe('Job date'),
      status: z.string().describe('Current job status'),
      type: z.string().optional().describe('Job type — Delivery or Collection'),
      assignTo: z.string().optional().describe('Assigned driver/vehicle'),
      address: z.string().optional().describe('Job address'),
      trackingNumber: z.string().optional().describe('Tracking number'),
      deliverTo: z.string().optional().describe('Recipient/sender name'),
      etaTime: z.string().optional().describe('Estimated arrival time'),
      completedAt: z.string().optional().describe('Completion timestamp'),
      receivedBy: z.string().optional().describe('Person who received the delivery'),
      reason: z.string().optional().describe('Failure or exception reason'),
      note: z.string().optional().describe('Driver note'),
      milestones: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Job milestones')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: Record<string, unknown>;
      try {
        body = (await ctx.request.json()) as Record<string, unknown>;
      } catch {
        return { inputs: [] };
      }

      // Detrack webhook payload may wrap job data in a "data" field or send it directly
      let jobData = (body.data && typeof body.data === 'object' ? body.data : body) as Record<
        string,
        unknown
      >;

      let doNumber = String(jobData.do_number ?? jobData.do ?? '');
      let date = String(jobData.date ?? '');

      if (!doNumber && !date) {
        return { inputs: [] };
      }

      let status = String(jobData.status ?? jobData.tracking_status ?? 'unknown');
      let milestones = Array.isArray(jobData.milestones)
        ? (jobData.milestones as Record<string, unknown>[])
        : undefined;

      return {
        inputs: [
          {
            jobId: jobData.id ? String(jobData.id) : undefined,
            doNumber,
            date,
            status,
            type: jobData.type ? String(jobData.type) : undefined,
            assignTo: jobData.assign_to ? String(jobData.assign_to) : undefined,
            address: jobData.address ? String(jobData.address) : undefined,
            trackingNumber: jobData.tracking_number
              ? String(jobData.tracking_number)
              : undefined,
            deliverTo: jobData.deliver_to_collect_from
              ? String(jobData.deliver_to_collect_from)
              : undefined,
            etaTime: jobData.eta_time ? String(jobData.eta_time) : undefined,
            completedAt: jobData.pod_at ? String(jobData.pod_at) : undefined,
            receivedBy: jobData.received_by ? String(jobData.received_by) : undefined,
            reason: jobData.reason ? String(jobData.reason) : undefined,
            note: jobData.note ? String(jobData.note) : undefined,
            milestones,
            raw: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let statusNormalized = ctx.input.status.toLowerCase().replace(/\s+/g, '_');
      let eventType = `job.${statusNormalized}`;

      // Use a combination of job ID / DO number + date + status for dedup
      let dedupId = `${ctx.input.jobId ?? ctx.input.doNumber}-${ctx.input.date}-${ctx.input.status}-${Date.now()}`;

      return {
        type: eventType,
        id: dedupId,
        output: {
          jobId: ctx.input.jobId,
          doNumber: ctx.input.doNumber,
          date: ctx.input.date,
          status: ctx.input.status,
          type: ctx.input.type,
          assignTo: ctx.input.assignTo,
          address: ctx.input.address,
          trackingNumber: ctx.input.trackingNumber,
          deliverTo: ctx.input.deliverTo,
          etaTime: ctx.input.etaTime,
          completedAt: ctx.input.completedAt,
          receivedBy: ctx.input.receivedBy,
          reason: ctx.input.reason,
          note: ctx.input.note,
          milestones: ctx.input.milestones
        }
      };
    }
  })
  .build();
