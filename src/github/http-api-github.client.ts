import { ConfigService } from '@nestjs/config';
import { Inject, Injectable } from '@nestjs/common';
import { HTTP_CONSTANTS } from 'src/http/http.constants';
import { HttpMethod } from 'src/http/enums/http-method.enum';
import { GithubUser } from './interfaces/github-user.interface';
import { GithubEmail } from './interfaces/github-email.interface';
import { GithubClient } from './interfaces/github-client.interface';
import { HttpClient } from 'src/http/interfaces/http-client.interface';
import { GithubGetAccessTokenResponse } from './interfaces/github-get-access-token-response.interface';

@Injectable()
export class HttpAPIGithubClientImpl implements GithubClient {
  private readonly clientId: string;
  private readonly apiBaseURL: string;
  private readonly authBaseURL: string;
  private readonly clientSecret: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(HTTP_CONSTANTS.APPLICATION.CLIENT_TOKEN)
    private readonly httpClient: HttpClient,
  ) {
    this.clientSecret = this.configService.get<string>(
      'GITHUB_OAUTH_CLIENT_SECRET',
    );
    this.apiBaseURL = this.configService.get<string>('GITHUB_API_BASE_URL');
    this.clientId = this.configService.get<string>('GITHUB_OAUTH_CLIENT_ID');
    this.authBaseURL = this.configService.get<string>('GITHUB_AUTH_BASE_URL');
  }

  public getOAuthAuthorizeURL(redirectURI: string): string {
    const oauthUSP = new URLSearchParams();

    oauthUSP.set('client_id', this.clientId);
    oauthUSP.set('redirect_uri', redirectURI);
    oauthUSP.set('scope', ['read:user', 'user:email'].join(' '));

    const oauthURL = `${
      this.authBaseURL
    }/login/oauth/authorize?${oauthUSP.toString()}`;

    return oauthURL;
  }

  public async getAccessToken(code: string): Promise<string> {
    const response =
      await this.httpClient.request<GithubGetAccessTokenResponse>({
        method: HttpMethod.POST,
        headers: {
          Accept: 'application/json',
        },
        query: {
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
        },
        url: `${this.authBaseURL}/login/oauth/access_token`,
      });

    return response.access_token;
  }

  public async getUser(accessToken: string): Promise<GithubUser> {
    const response = await this.httpClient.request<GithubUser>({
      method: HttpMethod.GET,
      headers: {
        'User-Agent': 'request',
        Authorization: `Bearer ${accessToken}`,
      },
      url: `${this.apiBaseURL}/user`,
    });

    return response;
  }

  public async getVerifiedPrimaryEmail(
    accessToken: string,
  ): Promise<string> {
    const response = await this.httpClient.request<GithubEmail[]>({
      method: HttpMethod.GET,
      headers: {
        'User-Agent': 'request',
        Authorization: `Bearer ${accessToken}`,
      },
      url: `${this.apiBaseURL}/user/emails`,
    });

    for (const record of response) {
      if (!record.primary || !record.verified) {
        continue;
      }

      return record.email;
    }
  }
}
