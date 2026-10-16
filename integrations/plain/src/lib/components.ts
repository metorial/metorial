import { createApiServiceError } from 'slates';

type Component = {
  componentText?: { text: string };
  componentSpacer?: { spacerSize: 'XS' | 'S' | 'M' | 'L' | 'XL' };
  componentLinkButton?: { linkButtonLabel: string; linkButtonUrl: string };
};

export let validateComponents = (components: Component[]) => {
  if (components.length === 0) {
    throw createApiServiceError('Provide at least one content component');
  }
  for (let component of components) {
    if (Object.values(component).filter(value => value !== undefined).length !== 1) {
      throw createApiServiceError(
        'Each component must contain exactly one text, spacer, or link button'
      );
    }
  }
};

// The current reply API accepts text and Markdown; retain the existing component input.
export let getReplyContent = (components: Component[]) => {
  validateComponents(components);
  let text: string[] = [];
  let markdown: string[] = [];
  for (let component of components) {
    if (component.componentText) {
      text.push(component.componentText.text);
      markdown.push(component.componentText.text);
    } else if (component.componentLinkButton) {
      let { linkButtonLabel, linkButtonUrl } = component.componentLinkButton;
      text.push(`${linkButtonLabel} (${linkButtonUrl})`);
      let label = linkButtonLabel
        .replace(/[\\`*_[\]<>!&]/g, '\\$&')
        .replace(/[\r\n]/g, character => `&#${character.charCodeAt(0)};`);
      let destination = linkButtonUrl
        .replace(/[\\()<>&]/g, '\\$&')
        .replace(/\s/g, character => encodeURIComponent(character));
      markdown.push(`[${label}](${destination})`);
    } else {
      text.push('');
      markdown.push('');
    }
  }
  let textContent = text.join('\n\n');
  if (!textContent.trim()) {
    throw createApiServiceError('Provide text or a link in the reply components');
  }
  return { textContent, markdownContent: markdown.join('\n\n') };
};
