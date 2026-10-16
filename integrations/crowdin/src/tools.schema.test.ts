import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { provider } from './index';

// Consolidated actions require an object root despite their branch-specific inputs.
describeMcpCompatibleToolSchemas('Crowdin tool input schemas', provider.actions);
