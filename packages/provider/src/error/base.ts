import { inferSlateErrorFromAxios, isAxiosErrorLike } from './axios';
import { DEFAULT_CODE } from './defaults';
import { getServiceErrorData, mapServiceErrorToSlateErrorInput } from './service';
import type { SlateAxiosErrorOptions, SlateErrorInput, SlateErrorResponse } from './types';
import {
  getDefaultMessage,
  isSlateErrorResponse,
  mergeRecords,
  mergeSlateErrorData,
  normalizeSlateErrorInput,
  sanitizeForBaggage
} from './utils';

export class SlateError extends Error {
  cause?: unknown;
  data: SlateErrorResponse;

  constructor(input: SlateErrorInput) {
    let normalized = normalizeSlateErrorInput(input);
    super(normalized.message);
    this.name = 'SlateError';
    this.data = normalized;
    this.cause = input.cause;
  }

  get code() {
    return this.data.code;
  }

  get kind() {
    return this.data.kind;
  }

  get status() {
    return this.data.status;
  }

  get retryable() {
    return this.data.retryable;
  }

  toResponse(): SlateErrorResponse {
    return {
      ...this.data
    };
  }

  toJSON(): SlateErrorResponse {
    return this.toResponse();
  }

  static is(error: unknown): error is SlateError {
    return error instanceof SlateError;
  }

  static fromUnknown(error: unknown, defaults: Partial<SlateErrorResponse> = {}): SlateError {
    if (SlateError.is(error)) return error;
    if (isSlateErrorResponse(error)) return new SlateError({ ...defaults, ...error });
    if (getServiceErrorData(error)) return SlateError.fromServiceError(error, defaults);
    if (isAxiosErrorLike(error)) return SlateError.fromAxios(error, { defaults });

    if (error instanceof Error) {
      return new SlateError({
        code: defaults.code ?? DEFAULT_CODE,
        message: error.message,
        kind: defaults.kind,
        retryable: defaults.retryable,
        status: defaults.status,
        issues: defaults.issues,
        provider: defaults.provider,
        upstream: defaults.upstream,
        baggage: mergeRecords(defaults.baggage, {
          originalName: error.name
        }),
        cause: error
      });
    }

    return new SlateError({
      code: defaults.code ?? DEFAULT_CODE,
      message: getDefaultMessage(defaults.code ?? DEFAULT_CODE, defaults.message),
      kind: defaults.kind,
      retryable: defaults.retryable,
      status: defaults.status,
      issues: defaults.issues,
      provider: defaults.provider,
      upstream: defaults.upstream,
      baggage: mergeRecords(defaults.baggage, {
        originalValue: sanitizeForBaggage(error)
      })
    });
  }

  static fromServiceError(
    error: unknown,
    defaults: Partial<SlateErrorInput> = {}
  ): SlateError {
    return new SlateError(mapServiceErrorToSlateErrorInput(error as any, defaults));
  }

  static fromAxios(error: unknown, options: SlateAxiosErrorOptions = {}): SlateError {
    if (SlateError.is(error)) return error;
    if (getServiceErrorData(error))
      return SlateError.fromServiceError(error, options.defaults);
    if (!isAxiosErrorLike(error)) return SlateError.fromUnknown(error, options.defaults);

    let inferred = inferSlateErrorFromAxios(error, options);

    let mapped = options.mapAxiosError?.(error, inferred);
    if (SlateError.is(mapped)) return mapped;

    return new SlateError(mergeSlateErrorData(inferred, mapped ?? undefined));
  }
}

export let createSlateError = (input: SlateErrorInput) => new SlateError(input);
