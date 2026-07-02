import { SlateTool } from 'slates';
import { z } from 'zod';
import { AsticaVisionClient } from '../lib/client';
import { spec } from '../spec';

export let analyzeImageTool = SlateTool.create(spec, {
  name: 'Analyze Image',
  key: 'analyze_image',
  description: `Analyze an image using Astica's computer vision AI. Supports image captioning, object detection, face detection, OCR text reading, content moderation, tagging, GPT-powered descriptions, brand detection, celebrity recognition, and landmark detection.
Provide an image via HTTPS URL or Base64-encoded string, and select which vision capabilities to apply.`,
  instructions: [
    'Provide the image as an HTTPS URL or a Base64-encoded string (PNG or JPG only).',
    'Use the visionFeatures array to select which analysis capabilities to apply.',
    'For GPT-powered descriptions, include "gpt" or "gptDetailed" in visionFeatures and optionally set gptPrompt and promptLength.',
    'For custom object detection, include "customObjects" in visionFeatures and provide customObjectKeywords.'
  ],
  constraints: [
    'Only PNG and JPG image formats are supported.',
    'Maximum image size is 20MB and 16000x16000 pixels.',
    'GPT prompt must be 8-325 characters if provided.',
    'Prompt length must be 8-250 words if provided.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      imageUrl: z
        .string()
        .describe('HTTPS URL or Base64-encoded string of the image to analyze'),
      visionFeatures: z
        .array(
          z.enum([
            'describe',
            'describeAll',
            'textRead',
            'gpt',
            'gptDetailed',
            'faces',
            'objects',
            'customObjects',
            'objectColors',
            'moderate',
            'tags',
            'brands',
            'celebrities',
            'landmarks'
          ])
        )
        .optional()
        .describe('Vision capabilities to apply. Defaults to describe, tags, and objects.'),
      modelVersion: z
        .enum(['1.0_full', '2.0_full', '2.1_full', '2.5_full'])
        .optional()
        .describe('Model version to use. Defaults to 2.5_full.'),
      gptPrompt: z
        .string()
        .optional()
        .describe('Custom prompt for GPT description (8-325 characters)'),
      promptLength: z
        .number()
        .optional()
        .describe('Target word count for GPT description (8-250 words)'),
      customObjectKeywords: z
        .string()
        .optional()
        .describe(
          'Comma-separated keywords for custom object detection (requires customObjects feature)'
        )
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status'),
      caption: z
        .object({
          text: z.string(),
          confidence: z.number()
        })
        .optional()
        .describe('Primary image caption'),
      captionList: z
        .array(
          z.object({
            text: z.string(),
            confidence: z.number()
          })
        )
        .optional()
        .describe('Multiple alternative captions'),
      gptDescription: z.string().optional().describe('GPT-generated detailed description'),
      tags: z
        .array(
          z.object({
            name: z.string(),
            confidence: z.number()
          })
        )
        .optional()
        .describe('Descriptive tags'),
      objects: z
        .array(
          z.object({
            name: z.string(),
            confidence: z.number(),
            rectangle: z
              .object({
                x: z.number(),
                y: z.number(),
                w: z.number(),
                h: z.number()
              })
              .optional()
          })
        )
        .optional()
        .describe('Detected objects with bounding boxes'),
      customObjects: z.array(z.any()).optional().describe('Custom keyword detections'),
      faces: z
        .array(
          z.object({
            age: z.number().optional(),
            gender: z.string().optional(),
            rectangle: z
              .object({
                x: z.number(),
                y: z.number(),
                w: z.number(),
                h: z.number()
              })
              .optional()
          })
        )
        .optional()
        .describe('Detected faces with age and gender'),
      textRead: z.any().optional().describe('OCR text reading results with positions'),
      moderate: z
        .object({
          isAdultContent: z.boolean().optional(),
          adultScore: z.number().optional(),
          isRacyContent: z.boolean().optional(),
          racyScore: z.number().optional(),
          isGoryContent: z.boolean().optional(),
          goreScore: z.number().optional()
        })
        .optional()
        .describe('Content moderation scores'),
      categories: z
        .array(
          z.object({
            name: z.string(),
            score: z.number()
          })
        )
        .optional()
        .describe('Image categories'),
      brands: z.array(z.any()).optional().describe('Detected brand logos'),
      celebrities: z.array(z.any()).optional().describe('Recognized celebrities'),
      landmarks: z.array(z.any()).optional().describe('Detected landmarks'),
      colors: z.any().optional().describe('Color analysis results'),
      metadata: z
        .object({
          width: z.number().optional(),
          height: z.number().optional(),
          format: z.string().optional()
        })
        .optional()
        .describe('Image metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AsticaVisionClient(ctx.auth.token);

    let featureMap: Record<string, string> = {
      describe: 'describe',
      describeAll: 'describe_all',
      textRead: 'text_read',
      gpt: 'gpt',
      gptDetailed: 'gpt_detailed',
      faces: 'faces',
      objects: 'objects',
      customObjects: 'objects_custom',
      objectColors: 'objects_color',
      moderate: 'moderate',
      tags: 'tags',
      brands: 'brands',
      celebrities: 'celebrities',
      landmarks: 'landmarks'
    };

    let features = ctx.input.visionFeatures || ['describe', 'tags', 'objects'];
    let visionParams = features.map(f => featureMap[f] || f).join(',');

    ctx.info(`Analyzing image with features: ${visionParams}`);

    let result = await client.analyzeImage({
      imageUrl: ctx.input.imageUrl,
      modelVersion: ctx.input.modelVersion,
      visionParams,
      gptPrompt: ctx.input.gptPrompt,
      promptLength: ctx.input.promptLength,
      customObjectKeywords: ctx.input.customObjectKeywords
    });

    let output = {
      status: result.status || 'unknown',
      caption: result.caption,
      captionList: result.caption_list,
      gptDescription: result.caption_GPTS,
      tags: result.tags,
      objects: result.objects,
      customObjects: result.objects_custom,
      faces: result.faces,
      textRead: result.readResult,
      moderate: result.moderate,
      categories: result.categories,
      brands: result.brands,
      celebrities: result.celebrities,
      landmarks: result.landmarks,
      colors: result.colors,
      metadata: result.metadata
    };

    let captionText = output.caption?.text ? `Caption: "${output.caption.text}"` : '';
    let tagCount = output.tags?.length ? `${output.tags.length} tags` : '';
    let objectCount = output.objects?.length
      ? `${output.objects.length} objects detected`
      : '';

    let summaryParts = [captionText, tagCount, objectCount].filter(Boolean);

    return {
      output,
      message: `Image analyzed successfully. ${summaryParts.join(', ')}.`
    };
  })
  .build();
