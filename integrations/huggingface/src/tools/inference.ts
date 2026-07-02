import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubClient } from '../lib/client';
import { spec } from '../spec';

export let chatCompletionTool = SlateTool.create(spec, {
  name: 'Chat Completion',
  key: 'chat_completion',
  description: `Run a chat completion using a model on the Hugging Face Inference API. Follows the OpenAI-compatible chat completions format. Supports conversation history with system, user, and assistant messages.`,
  instructions: [
    'The model must be hosted on Hugging Face and accessible via the Inference API.',
    'Popular models include "openai/gpt-oss-120b:fastest", "Qwen/Qwen3-Coder-480B-A35B-Instruct:fastest", etc.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z.string().describe('Model ID (e.g. "meta-llama/Llama-3.1-8B-Instruct")'),
      messages: z
        .array(
          z.object({
            role: z.enum(['system', 'user', 'assistant']).describe('Message role'),
            content: z.string().describe('Message content')
          })
        )
        .describe('Conversation messages'),
      maxTokens: z.number().optional().describe('Maximum number of tokens to generate'),
      temperature: z.number().optional().describe('Sampling temperature (0-2)'),
      topP: z.number().optional().describe('Top-p nucleus sampling parameter'),
      stop: z.array(z.string()).optional().describe('Stop sequences')
    })
  )
  .output(
    z.object({
      completionId: z.string().optional().describe('Completion ID'),
      model: z.string().optional().describe('Model used'),
      content: z.string().describe('Generated response text'),
      finishReason: z.string().optional().describe('Reason generation stopped'),
      promptTokens: z.number().optional().describe('Number of tokens in the prompt'),
      completionTokens: z.number().optional().describe('Number of tokens generated'),
      totalTokens: z.number().optional().describe('Total tokens used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    let result = await client.chatCompletion({
      model: ctx.input.model,
      messages: ctx.input.messages,
      maxTokens: ctx.input.maxTokens,
      temperature: ctx.input.temperature,
      topP: ctx.input.topP,
      stop: ctx.input.stop
    });

    let choice = result.choices?.[0];

    return {
      output: {
        completionId: result.id,
        model: result.model,
        content: choice?.message?.content || '',
        finishReason: choice?.finish_reason,
        promptTokens: result.usage?.prompt_tokens,
        completionTokens: result.usage?.completion_tokens,
        totalTokens: result.usage?.total_tokens
      },
      message: `Generated chat completion using **${ctx.input.model}** (${result.usage?.total_tokens || '?'} tokens).`
    };
  })
  .build();

export let textGenerationTool = SlateTool.create(spec, {
  name: 'Text Generation',
  key: 'text_generation',
  description: `Generate text using a model on the Hugging Face Inference API. Provide a prompt and receive generated text continuation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z.string().describe('Model ID (e.g. "gpt2", "bigscience/bloom-560m")'),
      prompt: z.string().describe('Input prompt for text generation'),
      maxNewTokens: z.number().optional().describe('Maximum number of new tokens to generate'),
      temperature: z.number().optional().describe('Sampling temperature'),
      topP: z.number().optional().describe('Top-p nucleus sampling'),
      repetitionPenalty: z
        .number()
        .optional()
        .describe('Repetition penalty (> 1.0 discourages repetition)'),
      doSample: z.boolean().optional().describe('Whether to use sampling (false = greedy)'),
      returnFullText: z
        .boolean()
        .optional()
        .default(false)
        .describe('Return full text including prompt')
    })
  )
  .output(
    z.object({
      generatedText: z.string().describe('Generated text')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    let result = await client.textGeneration({
      model: ctx.input.model,
      inputs: ctx.input.prompt,
      maxNewTokens: ctx.input.maxNewTokens,
      temperature: ctx.input.temperature,
      topP: ctx.input.topP,
      repetitionPenalty: ctx.input.repetitionPenalty,
      doSample: ctx.input.doSample,
      returnFullText: ctx.input.returnFullText
    });

    let text = '';
    if (Array.isArray(result)) {
      text = result[0]?.generated_text || '';
    } else {
      text = result.generated_text || result;
    }

    return {
      output: { generatedText: typeof text === 'string' ? text : JSON.stringify(text) },
      message: `Generated text using **${ctx.input.model}**.`
    };
  })
  .build();

let getEmbeddingShape = (value: unknown): number[] => {
  let shape: number[] = [];
  let cursor = value;

  while (Array.isArray(cursor)) {
    shape.push(cursor.length);
    cursor = cursor[0];
  }

  return shape;
};

export let featureExtractionTool = SlateTool.create(spec, {
  name: 'Feature Extraction',
  key: 'feature_extraction',
  description: `Generate embeddings with a Hugging Face feature-extraction model. Use this for semantic search, RAG retrieval, clustering, and similarity workflows.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe(
          'Feature-extraction model ID (e.g. "sentence-transformers/all-MiniLM-L6-v2")'
        ),
      inputs: z
        .union([z.string(), z.array(z.string())])
        .describe('Text or list of texts to embed'),
      normalize: z.boolean().optional().describe('Whether to normalize returned embeddings'),
      truncate: z
        .boolean()
        .optional()
        .describe('Whether to truncate inputs that exceed model limits'),
      promptName: z
        .string()
        .optional()
        .describe('Prompt name from sentence-transformers model configuration'),
      truncationDirection: z
        .enum(['left', 'right'])
        .optional()
        .describe('Direction for input truncation')
    })
  )
  .output(
    z.object({
      embeddings: z.any().describe('Embedding vector or nested embedding vectors'),
      shape: z.array(z.number()).describe('Shape of the returned embedding array')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    let embeddings = await client.featureExtraction({
      model: ctx.input.model,
      inputs: ctx.input.inputs,
      normalize: ctx.input.normalize,
      truncate: ctx.input.truncate,
      promptName: ctx.input.promptName,
      truncationDirection: ctx.input.truncationDirection
    });
    let shape = getEmbeddingShape(embeddings);

    return {
      output: {
        embeddings,
        shape
      },
      message: `Generated embeddings using **${ctx.input.model}** with shape **${shape.join(' x ') || 'unknown'}**.`
    };
  })
  .build();

export let runInferenceTool = SlateTool.create(spec, {
  name: 'Run Inference',
  key: 'run_inference',
  description: `Run generic inference on any Hugging Face model. Supports a wide range of tasks: summarization, classification, NER, translation, embeddings, image classification, and more. Pass task-specific inputs and parameters.`,
  instructions: [
    "The exact input format depends on the model's task. Check the model card for expected inputs.",
    'For text tasks, pass the text string as inputs. For image tasks, pass the image URL.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z
        .string()
        .describe('Model ID (e.g. "facebook/bart-large-cnn" for summarization)'),
      inputs: z
        .any()
        .describe('Model inputs (string, array, or object depending on the task)'),
      parameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Task-specific parameters (e.g. max_length, min_length, candidate_labels)'),
      options: z
        .object({
          waitForModel: z
            .boolean()
            .optional()
            .describe('Wait for the model to load if not ready')
        })
        .optional()
        .describe('Inference options')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Inference result (format depends on model task)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    let result = await client.inference({
      modelId: ctx.input.modelId,
      inputs: ctx.input.inputs,
      parameters: ctx.input.parameters,
      options: ctx.input.options
    });

    return {
      output: { result },
      message: `Completed inference using **${ctx.input.modelId}**.`
    };
  })
  .build();
