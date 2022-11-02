import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/redis/interfaces/redis-service.interface';
import {
  PAYPAL_ACCESS_TOKEN_CACHING_KEY,
  PAYPAL_AUTH_REQUEST_DELAY_SECONDS,
} from './constants/payment.constant';
import { PaypalEnvironment } from './enums/paypal-environment.enum';
import { IncorrectPaypalApiAuthResponseError } from './errors/incorrect-paypal-api-auth-response.error';
import { PaypalAccessTokenNotCachedError } from './errors/paypal-access-token-not-cached.error';
import { PaypalAccessTokenNotFoundInCacheError } from './errors/paypal-access-token-not-found-in-cache.error';
import { PaymentService } from './interfaces/payment-service.interface';

@Injectable()
export class PaypalPaymentServiceImplementation
  implements PaymentService, OnModuleInit
{
  private readonly domain: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    const environment = this.configService.get<PaypalEnvironment>('PAYPAL_ENV');

    switch (environment) {
      case PaypalEnvironment.MAIN: {
        this.domain = 'https://api-m.paypal.com';

        break;
      }
      case PaypalEnvironment.SANDBOX: {
        this.domain = 'https://api-m.sandbox.com';

        break;
      }
      default: {
        throw new Error(
          'PAYPAL_ENV value in .env has to be one of the PaypalEnvironment enum values',
        );
      }
    }
  }

  public async onModuleInit(): Promise<void> {
    const expirationTimeInMs = await this.obtainAndCacheAccessToken();

    /**
     * Think of scalability in order to be able to use it
     * with multiple instances
     */
    setTimeout(async () => {
      this.onModuleInit();
    }, expirationTimeInMs);
  }

  public async createOrder(): Promise<string> {
    return 'orderId';
  }

  /**
   * Obtains and caches access token required for Bearer auth
   * Returns expiration time of the token in ms
   */
  private async obtainAndCacheAccessToken(): Promise<number> {
    const url = `${this.domain}/v1/oauth2/token`;
    const body = `${encodeURIComponent('grant_type')}=${encodeURIComponent(
      'client_credentials',
    )}`;
    const authorizationHeaders = this.getBasicAuthorizationHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en_US',
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: authorizationHeaders,
      },
      body,
    });
    const data = await response.json();

    if (!data.accessToken || !data.expires_in) {
      throw new IncorrectPaypalApiAuthResponseError();
    }

    const accessToken = await this.redisService.set<string>(
      PAYPAL_ACCESS_TOKEN_CACHING_KEY,
      data.accessToken,
      data.expires_in,
    );

    if (!accessToken) {
      throw new PaypalAccessTokenNotCachedError();
    }

    const expirationTimeInMs =
      (data.expires_in - PAYPAL_AUTH_REQUEST_DELAY_SECONDS) * 1000;

    return expirationTimeInMs;
  }

  private getBasicAuthorizationHeaders(): string {
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET');

    const credentials = `${clientId}:${clientSecret}`;
    const base64Credentials = Buffer.from(credentials).toString('base64');

    const authorizationHeaders = `Basic ${base64Credentials}`;

    return authorizationHeaders;
  }

  private async getBearerAuthorizationHeadersWithException(): Promise<string> {
    const accessToken = await this.redisService.get<string>(
      PAYPAL_ACCESS_TOKEN_CACHING_KEY,
    );

    if (!accessToken) {
      throw new PaypalAccessTokenNotFoundInCacheError();
    }

    const authorizationHeaders = `Bearer ${accessToken}`;

    return authorizationHeaders;
  }
}
