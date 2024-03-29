import { deepFreeze } from 'src/common/deep-freeze';

export const AUTH_CONSTANTS = deepFreeze({
  APPLICATION: {
    PROVIDER_REPOSITORY_TOKEN: Symbol('AUTH_PROVIDER_REPOSITORY_TOKEN'),
    USERS_AUTH_PROVIDERS_REPOSITORY_TOKEN: Symbol(
      'USERS_AUTH_PROVIDERS_REPOSITORY_TOKEN',
    ),
  },
  DOMAIN: {
    CONFIRMATION_HASH_TTL_SECONDS: 3600,
  },
});
