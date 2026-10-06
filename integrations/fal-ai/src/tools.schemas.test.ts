import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { provider } from './index';

// Schema regression coverage required for nested image-size and endpoint-ID variants.
describeMcpCompatibleToolSchemas('fal.ai tool input schemas', provider.actions);
