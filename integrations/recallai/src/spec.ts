import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'recallai',
  name: 'Recall.ai',
  description:
    'Unified API for capturing recordings, transcripts, and metadata from video conference meetings across platforms like Zoom, Google Meet, Microsoft Teams, Webex, and more.',
  metadata: {},
  config,
  auth
});
