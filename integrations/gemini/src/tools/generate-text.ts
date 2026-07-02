import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let partSchema = z
  .union([
    z.object({
      text: z.string().describe('Text content')
    }),
    z.object({
      inlineData: z
        .object({
          mimeType: z
            .string()
            .describe('MIME type of the data (e.g. "image/png", "audio/mp3")'),
          data: z.string().describe('Base64-encoded data')
        })
        .describe('Inline binary data')
    }),
    z.object({
      fileData: z
        .object({
          mimeType: z.string().optional().describe('MIME type of the file'),
          fileUri: z
            .string()
            .describe('URI of the file (from File API or Google Cloud Storage)')
        })
        .describe('Reference to an uploaded file')
    })
  ])
  .describe('Content part - text, inline data, or file reference');

let messageSchema = z.object({
  role: z.enum(['user', 'model']).describe('Role of the message sender'),
  parts: z.array(partSchema).describe('Content parts for this message')
});

let safetySettingSchema = z.object({
  category: z
    .enum([
      'HARM_CATEGORY_HARASSMENT',
      'HARM_CATEGORY_HATE_SPEECH',
      'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      'HARM_CATEGORY_DANGEROUS_CONTENT',
      'HARM_CATEGORY_CIVIC_INTEGRITY'
    ])
    .describe('Safety category'),
  threshold: z
    .enum(['BLOCK_NONE', 'BLOCK_LOW_AND_ABOVE', 'BLOCK_MEDIUM_AND_ABOVE', 'BLOCK_ONLY_HIGH'])
    .describe('Blocking threshold')
});

export let generateText = SlateTool.create(spec, {
  name: 'Generate Text',
  key: 'generate_text',
  description: `Generate text using Gemini models with multimodal input support. Supports single-turn and multi-turn conversations with text, images, audio, video, and document inputs. Configure generation parameters, safety settings, system instructions, JSON output mode, and function calling.`,
  instructions: [
    'Use "user" and "model" roles for multi-turn conversations. System instructions go in the systemInstruction field.',
    'For structured JSON output, set responseSchema with a JSON schema object and responseMimeType to "application/json".',
    'To use uploaded files, reference them via fileData parts with the fileUri from the File API.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe(
          'Model ID to use (e.g. "gemini-2.0-flash", "gemini-1.5-pro", "gemini-2.5-pro-preview-06-05")'
        ),
      messages: z
        .array(messageSchema)
        .describe('Conversation messages with role and content parts'),
      systemInstruction: z
        .string()
        .optional()
        .describe('System instruction text to guide model behavior'),
      temperature: z
        .number()
        .min(0)
        .max(2)
        .optional()
        .describe('Controls randomness. Lower values are more deterministic.'),
      maxOutputTokens: z.number().optional().describe('Maximum number of tokens to generate'),
      topP: z.number().min(0).max(1).optional().describe('Nucleus sampling parameter'),
      topK: z.number().optional().describe('Top-k sampling parameter'),
      stopSequences: z
        .array(z.string())
        .optional()
        .describe('Sequences that will stop generation'),
      responseMimeType: z
        .enum(['text/plain', 'application/json'])
        .optional()
        .describe('MIME type for the response format'),
      responseSchema: z
        .any()
        .optional()
        .describe(
          'JSON schema to enforce on the output when responseMimeType is "application/json"'
        ),
      candidateCount: z
        .number()
        .min(1)
        .max(8)
        .optional()
        .describe('Number of response candidates to generate'),
      safetySettings: z
        .array(safetySettingSchema)
        .optional()
        .describe('Safety filter settings'),
      cachedContentName: z
        .string()
        .optional()
        .describe('Resource name of cached content to reuse (e.g. "cachedContents/abc123")'),
      enableCodeExecution: z
        .boolean()
        .optional()
        .describe('Enable the built-in code execution tool'),
      enableGoogleSearch: z.boolean().optional().describe('Enable Google Search grounding'),
      enableUrlContext: z
        .boolean()
        .optional()
        .describe('Enable the URL Context tool for prompts that include URLs'),
      thinkingBudget: z
        .number()
        .optional()
        .describe(
          'Token budget for model thinking/reasoning (for models that support dynamic thinking)'
        ),
      thinkingLevel: z
        .enum(['MINIMAL', 'LOW', 'MEDIUM', 'HIGH'])
        .optional()
        .describe('Thinking level for Gemini 3 and later models')
    })
  )
  .output(
    z.object({
      text: z.string().nullable().describe('Generated text content'),
      finishReason: z
        .string()
        .nullable()
        .describe('Why generation stopped (e.g. "STOP", "MAX_TOKENS", "SAFETY")'),
      safetyRatings: z
        .array(
          z.object({
            category: z.string(),
            probability: z.string()
          })
        )
        .optional()
        .describe('Safety ratings for the response'),
      citationSources: z
        .array(
          z.object({
            startIndex: z.number().optional(),
            endIndex: z.number().optional(),
            uri: z.string().optional()
          })
        )
        .optional()
        .describe('Citation sources if grounding was used'),
      groundingSources: z
        .array(
          z.object({
            uri: z.string().optional(),
            title: z.string().optional(),
            sourceUri: z.string().optional(),
            imageUri: z.string().optional(),
            domain: z.string().optional()
          })
        )
        .optional()
        .describe('Grounding source chunks returned by Google Search or related tools'),
      webSearchQueries: z
        .array(z.string())
        .optional()
        .describe('Web search queries issued by grounding'),
      urlContextMetadata: z
        .object({
          urlMetadata: z
            .array(
              z.object({
                retrievedUrl: z.string().optional(),
                urlRetrievalStatus: z.string().optional()
              })
            )
            .optional()
        })
        .optional()
        .describe('URL retrieval metadata when URL Context was used'),
      promptTokenCount: z.number().describe('Number of tokens in the prompt'),
      candidateTokenCount: z.number().describe('Number of tokens in the response'),
      totalTokenCount: z.number().describe('Total tokens used'),
      modelVersion: z.string().optional().describe('Model version that processed the request')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let generationConfig: Record<string, any> = {};
    if (ctx.input.temperature !== undefined)
      generationConfig.temperature = ctx.input.temperature;
    if (ctx.input.maxOutputTokens !== undefined)
      generationConfig.maxOutputTokens = ctx.input.maxOutputTokens;
    if (ctx.input.topP !== undefined) generationConfig.topP = ctx.input.topP;
    if (ctx.input.topK !== undefined) generationConfig.topK = ctx.input.topK;
    if (ctx.input.stopSequences) generationConfig.stopSequences = ctx.input.stopSequences;
    if (ctx.input.responseMimeType)
      generationConfig.responseMimeType = ctx.input.responseMimeType;
    if (ctx.input.responseSchema) generationConfig.responseSchema = ctx.input.responseSchema;
    if (ctx.input.candidateCount) generationConfig.candidateCount = ctx.input.candidateCount;
    if (ctx.input.thinkingBudget !== undefined) {
      generationConfig.thinkingConfig = { thinkingBudget: ctx.input.thinkingBudget };
    }
    if (ctx.input.thinkingLevel) {
      generationConfig.thinkingConfig = {
        ...(generationConfig.thinkingConfig ?? {}),
        thinkingLevel: ctx.input.thinkingLevel
      };
    }

    let systemInstruction = ctx.input.systemInstruction
      ? { parts: [{ text: ctx.input.systemInstruction }] }
      : undefined;

    let tools: any[] | undefined;
    if (
      ctx.input.enableCodeExecution ||
      ctx.input.enableGoogleSearch ||
      ctx.input.enableUrlContext
    ) {
      tools = [];
      if (ctx.input.enableCodeExecution) {
        tools.push({ codeExecution: {} });
      }
      if (ctx.input.enableGoogleSearch) {
        tools.push({ googleSearch: {} });
      }
      if (ctx.input.enableUrlContext) {
        tools.push({ urlContext: {} });
      }
    }

    let result = await client.generateContent(ctx.input.model, {
      contents: ctx.input.messages,
      systemInstruction,
      generationConfig:
        Object.keys(generationConfig).length > 0 ? generationConfig : undefined,
      safetySettings: ctx.input.safetySettings,
      tools,
      cachedContent: ctx.input.cachedContentName
    });

    let candidate = result.candidates?.[0];
    let text =
      candidate?.content?.parts
        ?.filter((p: any) => p.text)
        .map((p: any) => p.text)
        .join('') ?? null;

    let finishReason = candidate?.finishReason ?? null;

    let safetyRatings = candidate?.safetyRatings?.map((r: any) => ({
      category: r.category,
      probability: r.probability
    }));

    let citationSources = candidate?.citationMetadata?.citationSources?.map((c: any) => ({
      startIndex: c.startIndex,
      endIndex: c.endIndex,
      uri: c.uri
    }));

    let groundingMetadata = candidate?.groundingMetadata ?? {};
    let groundingSources = groundingMetadata.groundingChunks?.map((chunk: any) => ({
      uri: chunk.web?.uri ?? chunk.retrievedContext?.uri ?? chunk.maps?.uri,
      title: chunk.web?.title ?? chunk.retrievedContext?.title ?? chunk.maps?.title,
      sourceUri: chunk.image?.sourceUri,
      imageUri: chunk.image?.imageUri,
      domain: chunk.image?.domain
    }));

    let urlContextMetadata = candidate?.urlContextMetadata
      ? {
          urlMetadata: candidate.urlContextMetadata.urlMetadata?.map((metadata: any) => ({
            retrievedUrl: metadata.retrievedUrl,
            urlRetrievalStatus: metadata.urlRetrievalStatus
          }))
        }
      : undefined;

    let usageMetadata = result.usageMetadata ?? {};

    return {
      output: {
        text,
        finishReason,
        safetyRatings,
        citationSources,
        groundingSources,
        webSearchQueries: groundingMetadata.webSearchQueries,
        urlContextMetadata,
        promptTokenCount: usageMetadata.promptTokenCount ?? 0,
        candidateTokenCount: usageMetadata.candidatesTokenCount ?? 0,
        totalTokenCount: usageMetadata.totalTokenCount ?? 0,
        modelVersion: result.modelVersion
      },
      message: `Generated text using **${ctx.input.model}**. Used ${usageMetadata.totalTokenCount ?? 0} total tokens. Finish reason: ${finishReason ?? 'unknown'}.`
    };
  })
  .build();
