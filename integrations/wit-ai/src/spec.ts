import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'witai',
  name: 'Wit.ai',
  description:
    'Wit.ai is a free NLP platform by Meta for building conversational interfaces. Extract intents, entities, and traits from text, detect languages, manage training data, and configure NLU apps programmatically.',
  metadata: {},
  config,
  auth
});
