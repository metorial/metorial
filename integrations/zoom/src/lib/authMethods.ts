/** Auth method key for the Team Chat chatbot (client credentials) identity. */
export let ZOOM_CHATBOT_AUTH_METHOD = 'chatbot';

/**
 * Auth methods that act as a Zoom user. The REST tools call user-level APIs
 * (`/users`, `/meetings`, `/chat/users/...`) that a chatbot token cannot use.
 */
export let ZOOM_USER_AUTH_METHODS = ['oauth', 'server_to_server_oauth'];
