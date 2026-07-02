import { SlateTool } from 'slates';
import { z } from 'zod';
import { NanonetsClient } from '../lib/client';
import { spec } from '../spec';

let predictionSchema = z.object({
  label: z.string().describe('Field or table header name'),
  extractedText: z.string().describe('Extracted/predicted value'),
  confidence: z.number().optional().describe('Confidence score'),
  type: z.string().optional().describe('Prediction type'),
  page: z.number().optional().describe('Page number'),
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

export let getPredictionResults = SlateTool.create(spec, {
  name: 'Get Prediction Results',
  key: 'get_prediction_results',
  description: `Retrieve extraction/prediction results for a previously processed document. Use this to check the status of async predictions or to retrieve detailed results by file ID or page ID.`,
  instructions: [
    'Use requestFileId (from async extraction) to get results for an entire file.',
    'Use pageId to get results for a specific page.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z.string().describe('ID of the model used for the prediction'),
      requestFileId: z
        .string()
        .optional()
        .describe('File-level ID returned from an extraction request'),
      pageId: z
        .string()
        .optional()
        .describe('Page-level ID for retrieving a specific page result')
    })
  )
  .output(
    z.object({
      fileName: z.string().optional().describe('Original file name'),
      fileUrl: z.string().optional().describe('URL of the processed file'),
      approvalStatus: z.string().optional().describe('Approval status of the file'),
      isModerated: z
        .boolean()
        .optional()
        .describe('Whether the file has been manually reviewed'),
      predictions: z.array(predictionSchema).describe('Extracted predictions'),
      rawResponse: z.any().optional().describe('Raw API response for additional details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NanonetsClient(ctx.auth.token);

    if (!ctx.input.requestFileId && !ctx.input.pageId) {
      throw new Error('Either requestFileId or pageId must be provided');
    }

    let result: any;

    if (ctx.input.requestFileId) {
      result = await client.getPredictionByFileId(ctx.input.modelId, ctx.input.requestFileId);
    } else if (ctx.input.pageId) {
      result = await client.getPredictionsByPage(ctx.input.modelId, ctx.input.pageId);
    }

    let predictions: any[] = [];
    let fileName: string | undefined;
    let fileUrl: string | undefined;
    let approvalStatus: string | undefined;
    let isModerated: boolean | undefined;

    if (result?.result && Array.isArray(result.result)) {
      for (let page of result.result) {
        fileName = fileName || page.input || page.original_file_name;
        fileUrl = fileUrl || page.file_url;
        approvalStatus = approvalStatus || page.approval_status;
        isModerated = isModerated ?? page.is_moderated;

        for (let pred of page.prediction || page.predicted_boxes || []) {
          predictions.push({
            label: pred.label,
            extractedText: pred.ocr_text || '',
            confidence: pred.score,
            type: pred.type,
            page: pred.page,
            boundingBox:
              pred.xmin != null
                ? {
                    xmin: pred.xmin,
                    ymin: pred.ymin,
                    xmax: pred.xmax,
                    ymax: pred.ymax
                  }
                : undefined
          });
        }
      }
    } else if (result) {
      fileName = result.input || result.original_file_name;
      fileUrl = result.file_url;
      approvalStatus = result.approval_status;
      isModerated = result.is_moderated;

      for (let pred of result.prediction || result.predicted_boxes || []) {
        predictions.push({
          label: pred.label,
          extractedText: pred.ocr_text || '',
          confidence: pred.score,
          type: pred.type,
          page: pred.page,
          boundingBox:
            pred.xmin != null
              ? {
                  xmin: pred.xmin,
                  ymin: pred.ymin,
                  xmax: pred.xmax,
                  ymax: pred.ymax
                }
              : undefined
        });
      }
    }

    return {
      output: {
        fileName,
        fileUrl,
        approvalStatus,
        isModerated,
        predictions,
        rawResponse: result
      },
      message: `Retrieved **${predictions.length}** predictions for file "${fileName || 'unknown'}". Status: ${approvalStatus || 'pending'}.`
    };
  })
  .build();
