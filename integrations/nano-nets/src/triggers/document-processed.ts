import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let predictionSchema = z.object({
  label: z.string().describe('Field or table header name'),
  extractedText: z.string().describe('Extracted/predicted value'),
  status: z
    .string()
    .optional()
    .describe('Prediction status (e.g., "moderated", "correctly_predicted")'),
  type: z.string().optional().describe('Type: "field" or "table"'),
  validationStatus: z.string().optional().describe('Validation status'),
  page: z.number().optional().describe('0-indexed page number'),
  boundingBox: z
    .object({
      xmin: z.number(),
      ymin: z.number(),
      xmax: z.number(),
      ymax: z.number()
    })
    .optional()
    .describe('Bounding box coordinates')
});

let webhookInputSchema = z.object({
  eventType: z.string().describe('Type of event that triggered the webhook'),
  fileId: z.string().describe('Unique identifier of the processed file'),
  modelId: z.string().optional().describe('Model ID that processed the file'),
  fileName: z.string().optional().describe('Original file name'),
  approvalStatus: z.string().optional().describe('Approval status of the file'),
  isModerated: z.boolean().optional().describe('Whether the file has been manually reviewed'),
  predictions: z.array(predictionSchema).optional().describe('Extracted predictions'),
  fileUrl: z.string().optional().describe('URL to access the processed file'),
  rawPayload: z.any().optional().describe('Raw webhook payload')
});

export let documentProcessed = SlateTrigger.create(spec, {
  name: 'Document Processed',
  key: 'document_processed',
  description:
    'Triggers when a document is processed, approved, rejected, or assigned in a Nanonets workflow. Configure webhooks in the Nanonets dashboard under Workflow > Export > Webhooks.'
})
  .input(webhookInputSchema)
  .output(
    z.object({
      fileId: z.string().describe('Unique identifier of the processed file'),
      modelId: z.string().optional().describe('Model ID that processed the file'),
      fileName: z.string().optional().describe('Original file name'),
      approvalStatus: z
        .string()
        .optional()
        .describe('Approval status (approved, rejected, or empty)'),
      isModerated: z
        .boolean()
        .optional()
        .describe('Whether the file has been manually reviewed'),
      predictions: z.array(predictionSchema).optional().describe('Extracted predictions'),
      fileUrl: z.string().optional().describe('URL to access the file')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let inputs: z.infer<typeof webhookInputSchema>[] = [];

      // Document-level payload: body.result is an object
      // Page-level payload: body.result is an array
      let resultData = body.result;

      if (resultData && !Array.isArray(resultData)) {
        // Document-level webhook payload
        let eventType = determineEventType(resultData);
        let predictions = extractPredictions(resultData);

        inputs.push({
          eventType,
          fileId: resultData.id || '',
          modelId: resultData.model_id,
          fileName: resultData.input,
          approvalStatus: resultData.approval_status,
          isModerated: resultData.is_moderated,
          predictions,
          fileUrl: resultData.file_url,
          rawPayload: body
        });
      } else if (Array.isArray(resultData)) {
        // Page-level webhook payload
        for (let pageGroup of resultData) {
          let pages = pageGroup.result || [pageGroup];

          for (let page of Array.isArray(pages) ? pages : [pages]) {
            let eventType = determineEventType(page);
            let predictions = extractPredictions(page);

            inputs.push({
              eventType,
              fileId: page.id || pageGroup.id || '',
              modelId: page.model_id,
              fileName: page.input,
              approvalStatus: page.approval_status,
              isModerated: page.is_moderated,
              predictions,
              fileUrl: page.file_url,
              rawPayload: page
            });
          }
        }
      }

      if (inputs.length === 0) {
        inputs.push({
          eventType: 'document.processed',
          fileId: body.id || 'unknown',
          rawPayload: body
        });
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.fileId,
        output: {
          fileId: ctx.input.fileId,
          modelId: ctx.input.modelId,
          fileName: ctx.input.fileName,
          approvalStatus: ctx.input.approvalStatus,
          isModerated: ctx.input.isModerated,
          predictions: ctx.input.predictions,
          fileUrl: ctx.input.fileUrl
        }
      };
    }
  })
  .build();

let determineEventType = (data: any): string => {
  if (data.approval_status === 'approved') {
    return 'document.approved';
  }
  if (data.approval_status === 'rejected') {
    return 'document.rejected';
  }
  if (data.assigned_member) {
    return 'document.assigned';
  }
  if (data.is_moderated) {
    return 'document.validated';
  }
  return 'document.processed';
};

let extractPredictions = (data: any): z.infer<typeof predictionSchema>[] => {
  let preds = data.prediction || data.moderated_boxes || data.predicted_boxes || [];
  return preds.map((p: any) => ({
    label: p.label || '',
    extractedText: p.ocr_text || '',
    status: p.status,
    type: p.type,
    validationStatus: p.validation_status,
    page: p.page,
    boundingBox:
      p.xmin != null
        ? {
            xmin: p.xmin,
            ymin: p.ymin,
            xmax: p.xmax,
            ymax: p.ymax
          }
        : undefined
  }));
};
