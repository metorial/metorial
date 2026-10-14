import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let analyzeImageForensics = SlateTool.create(spec, {
  name: 'Analyze Image Forensics',
  key: 'analyze_image_forensics',
  description:
    'Analyzes a public image for signs of AI generation or manipulation. Returns a classification, confidence level, authenticity assessment, explanation, and findings from the forensic methods used.',
  constraints: [
    'Requires a publicly accessible HTTP or HTTPS image URL.',
    'Costs 500 credits per successful analysis.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      imageUrl: z
        .string()
        .describe('Publicly accessible HTTP or HTTPS URL of the image to analyze')
    })
  )
  .output(
    z.object({
      status: z.number().describe('Internal analysis status returned by the provider'),
      title: z.string().describe('Generated title describing the image'),
      language: z.string().describe('Language used for the analysis'),
      tags: z.array(z.string()).describe('Tags describing the image'),
      label: z.string().describe('Image classification, such as AI-Generated or Human'),
      confidence: z
        .string()
        .describe('Classification confidence, such as High, Moderate, or Low'),
      authenticity: z
        .string()
        .describe('Authenticity assessment, such as Authentic or Manipulated'),
      conclusion: z.string().describe('Summary of the forensic findings'),
      analysis: z.string().describe('Complete forensic explanation'),
      methodsUsed: z
        .array(z.string())
        .describe('Forensic method identifiers used in the analysis'),
      methodFindings: z.array(
        z.object({
          id: z.string().describe('Forensic method identifier'),
          analysis: z.string().describe('Explanation of this method’s findings'),
          result: z.unknown().describe('Underlying forensic method result')
        })
      ),
      creditsUsed: z.number().describe('Credits charged for the analysis'),
      creditsRemaining: z.number().describe('Remaining account credit balance')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).detectAdvancedImage(
      ctx.input.imageUrl
    );
    return {
      output: {
        status: result.status,
        title: result.title,
        language: result.language,
        tags: result.tags,
        label: result.label,
        confidence: result.confidence,
        authenticity: result.authenticity,
        conclusion: result.conclusion,
        analysis: result.analysis,
        methodsUsed: result.tool_used,
        methodFindings: result.tools_used_analysis,
        creditsUsed: result.cost,
        creditsRemaining: result.balance
      },
      message: `Image forensic analysis complete: ${result.label}, ${result.confidence} confidence, ${result.authenticity}. ${result.conclusion}`
    };
  });
