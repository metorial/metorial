import { encode } from '@toon-format/toon';

export type SlateLogType = 'info' | 'warn' | 'error' | 'progress';
export type SlateLogFields = Record<string, unknown>;

export type SlateLogMessageInput =
  | string
  | Error
  | boolean
  | number
  | null
  | undefined
  | object
  | SlateLogMessageInput[];

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let normalizeMessage = (
  message: SlateLogMessageInput
): {
  message: string;
  data?: SlateLogFields;
} => {
  if (Array.isArray(message)) {
    let parts = message.map(part => normalizeMessage(part));
    let combinedMessage = parts
      .map(part => part.message)
      .filter(Boolean)
      .join(' ')
      .trim();

    let dataParts = parts
      .map(part => {
        if (part.data) {
          return {
            message: part.message,
            ...part.data
          };
        }

        return part.message;
      })
      .filter(Boolean);

    return {
      message: combinedMessage || 'Log entry',
      data: dataParts.length > 0 ? { parts: dataParts } : undefined
    };
  }

  if (typeof message === 'object') {
    if (message === null) return { message: 'null' };
    if (message instanceof Error) {
      return {
        message: `${message.name}: ${message.message}`,
        data: {
          error: {
            name: message.name,
            message: message.message,
            stack: message.stack
          }
        }
      };
    }

    if (isRecord(message) && typeof message.message === 'string') {
      let { message: text, ...data } = message;
      return {
        message: text || 'Log entry',
        data: Object.keys(data).length > 0 ? data : undefined
      };
    }

    return {
      message: encode(message),
      data: isRecord(message) ? message : undefined
    };
  }

  return { message: String(message) };
};

export interface SlateLogEntry {
  type: SlateLogType;
  message: string;
  timestamp: Date;
  data?: SlateLogFields;
}

export type SlateLogListener = (entries: SlateLogEntry[]) => void;

export class SlateLogger {
  #logs: SlateLogEntry[] = [];
  #listeners: SlateLogListener[] = [];
  #flushScheduled = false;

  constructor(listeners: SlateLogListener[] = []) {
    this.#listeners.push(...listeners);
  }

  private flush() {
    this.#flushScheduled = false;
    if (this.#logs.length === 0) return;
    let logs = this.#logs.splice(0);

    for (let listener of this.#listeners) {
      listener(logs);
    }
  }

  // A microtask batches each burst of log calls and still flushes before the invocation's
  // result goes out; the runtime drops log lines that arrive after the result.
  private scheduleFlush() {
    if (this.#flushScheduled) return;
    this.#flushScheduled = true;
    queueMicrotask(() => this.flush());
  }

  log(type: SlateLogType, message: SlateLogMessageInput) {
    let normalized = normalizeMessage(message);
    this.#logs.push({
      type,
      timestamp: new Date(),
      message: normalized.message,
      data: normalized.data
    });
    this.scheduleFlush();
  }

  info(...message: SlateLogMessageInput[]) {
    this.log('info', message.length === 1 ? message[0]! : message.flat());
  }

  warn(...message: SlateLogMessageInput[]) {
    this.log('warn', message.length === 1 ? message[0]! : message.flat());
  }

  error(...message: SlateLogMessageInput[]) {
    this.log('error', message.length === 1 ? message[0]! : message.flat());
  }

  progress(...message: SlateLogMessageInput[]) {
    this.log('progress', message.length === 1 ? message[0]! : message.flat());
  }
}
