export interface TranslationInput {
  title: string;
  content: string;
  language?: string;
  linkUrl?: string;
  linkText?: string;
  customCategory?: string;
}

// Beamer pairs every translation field by index; missing optional values must keep their slot.
export let translationParams = (translations: TranslationInput[]) => {
  let alignedField = (field: 'language' | 'linkUrl' | 'linkText' | 'customCategory') =>
    translations.some(translation => translation[field] !== undefined)
      ? translations.map(translation => translation[field] ?? '')
      : undefined;

  return {
    title: translations.map(translation => translation.title),
    content: translations.map(translation => translation.content),
    language: alignedField('language'),
    linkUrl: alignedField('linkUrl'),
    linkText: alignedField('linkText'),
    customCategory: alignedField('customCategory')
  };
};
