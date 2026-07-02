import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newScans = SlateTrigger.create(spec, {
  name: 'New Scans',
  key: 'new_scans',
  description:
    'Triggers when new barcode scan records are created. Polls for recent scans and emits events for each new scan detected.'
})
  .input(
    z.object({
      scanId: z.string().describe('Unique ID of the scan record'),
      barcodeValue: z.string().describe('Scanned barcode value'),
      serviceId: z.string().optional().describe('Service ID where the scan occurred'),
      serviceName: z.string().optional().describe('Service name'),
      userId: z.string().optional().describe('User ID who performed the scan'),
      userName: z.string().optional().describe('Username who performed the scan'),
      deviceName: z.string().optional().describe('Device name'),
      status: z.string().optional().describe('Validation status'),
      timestamp: z.string().optional().describe('Scan timestamp'),
      answers: z
        .array(
          z.object({
            questionId: z.string().optional(),
            answerText: z.string().optional()
          })
        )
        .optional()
        .describe('Submitted question answers'),
      properties: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional scan properties')
    })
  )
  .output(
    z.object({
      scanId: z.string().describe('Unique ID of the scan record'),
      barcodeValue: z.string().describe('Scanned barcode value'),
      serviceId: z.string().optional().describe('Service ID'),
      serviceName: z.string().optional().describe('Service name'),
      userId: z.string().optional().describe('User ID'),
      userName: z.string().optional().describe('Username'),
      deviceName: z.string().optional().describe('Device name'),
      status: z
        .string()
        .optional()
        .describe('Validation status: "1"=valid, "0"=invalid, "-1"=unvalidated'),
      timestamp: z.string().optional().describe('Scan timestamp'),
      answers: z
        .array(
          z.object({
            questionId: z.string().optional(),
            answerText: z.string().optional()
          })
        )
        .optional()
        .describe('Submitted question answers'),
      properties: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional scan properties')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client(ctx.auth.token);

      let lastScanId = (ctx.state as any)?.lastScanId as string | undefined;

      let result = await client.retrieveScans({
        limit: '100',
        orderBy: 'scan_id_desc'
      });

      let scans = result.scans;

      // Filter to only new scans
      if (lastScanId) {
        let lastId = Number.parseInt(lastScanId, 10);
        scans = scans.filter(s => Number.parseInt(s.scanId, 10) > lastId);
      }

      let newLastScanId = lastScanId;
      if (result.scans.length > 0) {
        // The first scan in desc order is the newest
        newLastScanId = result.scans[0].scanId;
      }

      return {
        inputs: scans.map(s => ({
          scanId: s.scanId,
          barcodeValue: s.tid || '',
          serviceId: s.service_id,
          serviceName: s.service,
          userId: s.user_id,
          userName: s.user,
          deviceName: s.device,
          status: s.status,
          timestamp: s.timestamp,
          answers: s.answers,
          properties: s.properties
        })),
        updatedState: {
          lastScanId: newLastScanId
        }
      };
    },
    handleEvent: async ctx => {
      return {
        type: 'scan.created',
        id: ctx.input.scanId,
        output: {
          scanId: ctx.input.scanId,
          barcodeValue: ctx.input.barcodeValue,
          serviceId: ctx.input.serviceId,
          serviceName: ctx.input.serviceName,
          userId: ctx.input.userId,
          userName: ctx.input.userName,
          deviceName: ctx.input.deviceName,
          status: ctx.input.status,
          timestamp: ctx.input.timestamp,
          answers: ctx.input.answers,
          properties: ctx.input.properties
        }
      };
    }
  })
  .build();
