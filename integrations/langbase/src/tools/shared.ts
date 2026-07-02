import { Buffer } from 'node:buffer';
import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let functionToolSchema = z.object({
  name: z.string().describe('Function name exposed to the model'),
  description: z.string().optional().describe('Function description exposed to the model'),
  parameters: z
    .record(z.string(), z.any())
    .optional()
    .describe('JSON Schema parameters for the function')
});

export let mapFunctionTools = (tools: z.infer<typeof functionToolSchema>[] | undefined) =>
  tools?.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      ...(tool.description !== undefined ? { description: tool.description } : {}),
      ...(tool.parameters !== undefined ? { parameters: tool.parameters } : {})
    }
  }));

export let mapMemoryNames = (memoryNames: string[] | undefined) =>
  memoryNames?.map(name => ({ name }));

export let requireExactlyOneDefined = (
  input: Record<string, unknown>,
  firstField: string,
  secondField: string,
  message: string
) => {
  let hasFirst = input[firstField] !== undefined;
  let hasSecond = input[secondField] !== undefined;

  if (hasFirst === hasSecond) {
    throw createApiServiceError(message);
  }

  return hasFirst ? firstField : secondField;
};

type DocumentContentInput = {
  contentBase64?: string;
  contentText?: string;
};

export let parseContentFromInput = (input: DocumentContentInput) => {
  let source = requireExactlyOneDefined(
    input,
    'contentBase64',
    'contentText',
    'Provide exactly one of contentBase64 or contentText.'
  );

  if (source === 'contentBase64') {
    return Buffer.from(input.contentBase64!, 'base64');
  }

  return input.contentText ?? '';
};

export let documentContentFromInput = (input: DocumentContentInput) => {
  let source = requireExactlyOneDefined(
    input,
    'contentBase64',
    'contentText',
    'Provide exactly one of contentBase64 or contentText.'
  );

  if (source === 'contentBase64') {
    return {
      contentBase64: Buffer.from(input.contentBase64!, 'base64').toString('base64')
    };
  }

  return {
    contentText: input.contentText ?? ''
  };
};
