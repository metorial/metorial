import { destatisValidationError } from './errors';
import type { GenesisSelection } from './types';

export let GENESIS_ATOMIC_CODE_PATTERN = /^[A-Za-z0-9*._+-]+$/;

let normalizeAtomicCode = (value: string, label: string, maximumLength: number) => {
  let normalized = value.trim();
  if (
    normalized.length < 1 ||
    normalized.length > maximumLength ||
    !GENESIS_ATOMIC_CODE_PATTERN.test(normalized)
  ) {
    throw destatisValidationError(
      `${label} must be 1-${maximumLength} characters using only letters, digits, *, ., _, +, or -.`
    );
  }
  return normalized;
};

let normalizeCodeList = (values: string[], label: string, maximumLength: number) => {
  if (values.length === 0) {
    throw destatisValidationError(`${label} requires at least one code.`);
  }
  let normalized = values.map((value, index) =>
    normalizeAtomicCode(value, `${label}[${index}]`, maximumLength)
  );
  if (new Set(normalized).size !== normalized.length) {
    throw destatisValidationError(`${label} contains duplicate codes.`);
  }
  return normalized;
};

let normalizeSelection = (
  selection: GenesisSelection,
  label: string,
  maximumValueCodeLength: number
) => {
  let variableCode = normalizeAtomicCode(selection.variableCode, `${label}.variableCode`, 6);
  let valueCodes = normalizeCodeList(
    selection.valueCodes,
    `${label}.valueCodes`,
    maximumValueCodeLength
  );
  return { variableCode, valueCodes };
};

export let encodeContents = (target: URLSearchParams, contents: string[] | undefined) => {
  if (contents === undefined) return;
  target.set('contents', normalizeCodeList(contents, 'contents', 6).join(','));
};

export let encodeSelections = (
  target: URLSearchParams,
  regionalSelection: GenesisSelection | undefined,
  classifyingSelections: GenesisSelection[] | undefined,
  maximumClassifyingSelections: number
) => {
  if (classifyingSelections !== undefined && classifyingSelections.length === 0) {
    throw destatisValidationError('classifyingSelections requires at least one entry.');
  }
  if ((classifyingSelections?.length ?? 0) > maximumClassifyingSelections) {
    throw destatisValidationError(
      `classifyingSelections accepts at most ${maximumClassifyingSelections} entries.`
    );
  }

  if (regionalSelection) {
    let regional = normalizeSelection(regionalSelection, 'regionalSelection', 8);
    target.set('regionalvariable', regional.variableCode);
    target.set('regionalkey', regional.valueCodes.join(','));
  }

  let seen = new Set<string>();
  for (let [index, input] of (classifyingSelections ?? []).entries()) {
    let selection = normalizeSelection(input, `classifyingSelections[${index}]`, 15);
    if (seen.has(selection.variableCode)) {
      throw destatisValidationError(
        `classifyingSelections contains duplicate variableCode ${selection.variableCode}.`
      );
    }
    seen.add(selection.variableCode);
    target.set(`classifyingvariable${index + 1}`, selection.variableCode);
    target.set(`classifyingkey${index + 1}`, selection.valueCodes.join(','));
  }
};
