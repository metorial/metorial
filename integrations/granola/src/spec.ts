import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'granola',
  name: 'Granola',
  description:
    'Read meeting folders, meeting-note metadata, summaries, attendees, calendar context, and paginated transcripts from Granola.',
  metadata: {},
  config,
  auth
});
