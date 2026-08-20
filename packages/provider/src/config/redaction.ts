import { computeSlateConfigSchemaV2Hash } from '@slates/proto';
import type { SlateConfigSchemaWireV2 } from './config';

let REDACTED = '[redacted]';
let ALWAYS_CLASSIFIED_KEYS =
  /(?:ciphertext|encrypted(?:value|material|payload)?|secretref|grant|token)$/i;

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export interface ConfigRedactionPolicy {
  readonly version: 2;
  readonly hash: string;
  readonly secretKeys: ReadonlySet<string>;
  readonly plainKeys: ReadonlySet<string>;
  redact<Value>(value: Value, d?: { rootConfig?: boolean }): Value;
  projectPresence(config: Record<string, unknown>): Record<string, unknown>;
  assertProviderOutput(output: unknown): void;
}

export let compileConfigRedactionPolicy = (
  schema: SlateConfigSchemaWireV2 | null | undefined
): ConfigRedactionPolicy => {
  let valid =
    schema?.version === 2 &&
    /^[a-f0-9]{64}$/.test(schema.hash) &&
    JSON.stringify(schema.fieldOrder) === JSON.stringify(Object.keys(schema.fields).sort()) &&
    schema.hash === computeSlateConfigSchemaV2Hash(schema);
  let activeSchema = valid ? schema! : null;
  let fields = activeSchema?.fields ?? {};
  let secretKeys = new Set(
    Object.entries(fields)
      .filter(([, descriptor]) => descriptor.visibility === 'secret')
      .map(([key]) => key)
  );
  let plainKeys = new Set(
    Object.entries(fields)
      .filter(([, descriptor]) => descriptor.visibility === 'plain')
      .map(([key]) => key)
  );

  let redact = <Value>(value: Value, d: { rootConfig?: boolean } = {}): Value => {
    let seen = new WeakMap<object, unknown>();
    let visit = (entry: unknown, rootConfig: boolean): unknown => {
      if (entry === null || typeof entry !== 'object') return entry;
      if (entry instanceof Error) {
        let error = Object.create(Object.getPrototypeOf(entry)) as Error &
          Record<string, unknown> & { cause?: unknown };
        Object.defineProperties(error, {
          message: { value: String(visit(entry.message, false)), writable: true },
          name: { value: entry.name, writable: true },
          stack: {
            value: entry.stack ? String(visit(entry.stack, false)) : undefined,
            writable: true
          }
        });
        Object.entries(entry).forEach(([key, child]) => {
          error[key] = visit(child, false);
        });
        let cause = (entry as Error & { cause?: unknown }).cause;
        if (cause !== undefined) error.cause = visit(cause, false);
        return error;
      }
      let existing = seen.get(entry);
      if (existing) return existing;
      if (Array.isArray(entry)) {
        let result: unknown[] = [];
        seen.set(entry, result);
        for (let child of entry) result.push(visit(child, false));
        return result;
      }
      let result: Record<string, unknown> = {};
      seen.set(entry, result);
      let descriptorRoot =
        rootConfig ||
        Object.keys(entry as Record<string, unknown>).some(
          key => secretKeys.has(key) || plainKeys.has(key)
        );
      for (let [key, child] of Object.entries(entry as Record<string, unknown>)) {
        let normalized = key.replaceAll(/[-_.]/g, '');
        if (descriptorRoot && secretKeys.has(key)) {
          result[key] = { configured: child !== undefined };
        } else if (descriptorRoot && plainKeys.has(key)) {
          result[key] = visit(child, false);
        } else if (descriptorRoot) {
          // Missing/stale/unknown schemas are deny-by-default: unknown config keys disappear.
        } else if (ALWAYS_CLASSIFIED_KEYS.test(normalized)) {
          result[key] = REDACTED;
        } else {
          result[key] = visit(child, false);
        }
      }
      return result;
    };
    return visit(value, d.rootConfig ?? false) as Value;
  };

  let projectPresence = (config: Record<string, unknown>) =>
    redact(config, { rootConfig: true }) as Record<string, unknown>;

  let assertProviderOutput = (output: unknown) => {
    if (!isRecord(output)) return;
    let attempted = Object.keys(output).filter(key => secretKeys.has(key));
    if (attempted.length > 0) {
      throw new Error(
        `Provider output attempted to set classified config fields: ${attempted.sort().join(', ')}`
      );
    }
  };

  return {
    version: 2,
    hash: activeSchema?.hash ?? 'invalid',
    secretKeys,
    plainKeys,
    redact,
    projectPresence,
    assertProviderOutput
  };
};

export let redactConfigDenyByDefault = <Value>(value: Value): Value =>
  compileConfigRedactionPolicy(undefined).redact(value, { rootConfig: true });
