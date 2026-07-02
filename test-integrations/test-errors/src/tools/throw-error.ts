import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let errorTypes = [
  'error',
  'type_error',
  'range_error',
  'syntax_error',
  'reference_error',
  'uri_error',
  'eval_error',
  'string',
  'object',
  'null',
  'undefined',
  'rejection',
  'custom'
] as const;

export let throwError = SlateTool.create(spec, {
  name: 'Throw Error',
  key: 'throw_error',
  description: `Throw an error of the requested type. Useful for exercising error handling, retry logic, and reporting paths. The tool will ALWAYS fail; it never returns a successful result.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      errorType: z
        .enum(errorTypes)
        .default('error')
        .describe(
          'Kind of error to raise. Values like "type_error" / "range_error" throw the matching built-in Error subclass. "string" / "object" / "null" / "undefined" throw a non-Error value. "rejection" returns a rejected promise. "custom" throws an Error whose `name` is taken from `customName`.'
        ),
      message: z
        .string()
        .default('Intentional test error')
        .describe('Message attached to the thrown error.'),
      customName: z
        .string()
        .optional()
        .describe(
          'Name to assign to the thrown error when `errorType` is "custom". Defaults to "CustomError".'
        ),
      delayMs: z
        .number()
        .int()
        .min(0)
        .max(60_000)
        .default(0)
        .describe('Milliseconds to wait before throwing the error.')
    })
  )
  .output(z.object({}))
  .handleInvocation(async ctx => {
    let { errorType, message, customName, delayMs } = ctx.input;

    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    switch (errorType) {
      case 'error':
        throw new Error(message);
      case 'type_error':
        throw new TypeError(message);
      case 'range_error':
        throw new RangeError(message);
      case 'syntax_error':
        throw new SyntaxError(message);
      case 'reference_error':
        throw new ReferenceError(message);
      case 'uri_error':
        throw new URIError(message);
      case 'eval_error':
        throw new EvalError(message);
      case 'string':
        throw message;
      case 'object':
        throw { message, thrownAs: 'object' };
      case 'null':
        throw null;
      case 'undefined':
        throw undefined;
      case 'rejection':
        return Promise.reject(new Error(message));
      case 'custom': {
        let err = new Error(message);
        err.name = customName ?? 'CustomError';
        throw err;
      }
    }
  })
  .build();
