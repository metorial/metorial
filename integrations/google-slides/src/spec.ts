import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'google-slides',
  name: 'Google Slides',
  description:
    'Create, read, edit, and delete Google Slides presentations. Create and manipulate slides with predefined or custom layouts. Insert, style, and replace text across slides, including bulk placeholder replacement for template-based generation. Add and position shapes, text boxes, lines, and images. Embed and refresh charts linked to Google Sheets. Manage speaker notes, duplicate or reorder slides, and perform batch updates combining multiple operations in a single call. Supports automated report and deck generation using templates with placeholder text and image substitution.',
  metadata: {},
  config,
  auth
});
