import { destatisValidationError } from './errors';
import type { GenesisSelection } from './types';

let normalizeSelection = (
  selection: GenesisSelection,
  label: string,
  maximumValueCodeLength: number
) => {
  let variableCode = selection.variableCode.trim();
  let valueCodes = selection.valueCodes.map(value => value.trim());
  if (
    variableCode.length < 1 ||
    variableCode.length > 6 ||
    valueCodes.length === 0 ||
    valueCodes.some(value => value.length < 1 || value.length > maximumValueCodeLength)
  ) {
    throw destatisValidationError(
      `${label} requires a 1-6 character variableCode and non-empty valueCodes of at most ${maximumValueCodeLength} characters.`
    );
  }
  return { variableCode, valueCodes };
};

export let encodeSelections = (
  target: URLSearchParams,
  regionalSelection: GenesisSelection | undefined,
  classifyingSelections: GenesisSelection[] | undefined,
  maximumClassifyingSelections: number
) => {
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
