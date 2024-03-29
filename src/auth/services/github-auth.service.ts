import { ConfigService } from '@nestjs/config';
import { Inject, Injectable } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { AuthError } from '../errors/auth.error';
import { AUTH_CONSTANTS } from '../auth.constants';
import { JWT_CONSTANTS } from 'src/jwt/jwt.constants';
import { USER_CONSTANTS } from 'src/user/user.constants';
import { AuthProviders } from '../enums/auth-providers.enum';
import { MAILER_CONSTANTS } from 'src/mailer/mailer.constants';
import { GITHUB_CONSTANTS } from 'src/github/github.constants';
import { IJwtPair } from 'src/jwt/interfaces/jwt-pair.interface';
import { IJwtService } from 'src/jwt/interfaces/jwt-service.interface';
import { PropagatedTransaction } from '@mokuteki/propagated-transactions';
import { IGithubLocalSignUp } from '../interfaces/github-sign-up.interface';
import { IGithubILocalSignIn } from '../interfaces/github-sign-in.interface';
import { IGithubClient } from 'src/github/interfaces/github-client.interface';
import { TRANSACTION_CONSTANTS } from 'src/transaction/transaction.constants';
import { IMailerService } from 'src/mailer/interfaces/mailer-service.interface';
import { CRYPTOGRAPHY_CONSTANTS } from 'src/cryptography/cryptography.constants';
import { IAuthorizeWithGithub } from '../interfaces/authorize-with-github.interface';
import { UserConfirmationStatuses } from 'src/user/enums/user-confirmation-statuses.enum';
import { IAuthProviderRepository } from '../interfaces/auth-provider-repository.interface';
import { ICryptographyService } from 'src/cryptography/interfaces/cryptography-service.interface';
import { IUsersAuthProvidersRepository } from '../interfaces/users-auth-providers-repository.interface';

@Injectable()
export class GithubAuthService {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    @Inject(JWT_CONSTANTS.APPLICATION.SERVICE_TOKEN)
    private readonly jwtService: IJwtService,
    @Inject(GITHUB_CONSTANTS.APPLICATION.CLIENT_TOKEN)
    private readonly githubClient: IGithubClient,
    @Inject(CRYPTOGRAPHY_CONSTANTS.APPLICATION.SERVICE_TOKEN)
    private readonly cryptographyService: ICryptographyService,
    @Inject(MAILER_CONSTANTS.APPLICATION.SERVICE_TOKEN)
    private readonly mailerService: IMailerService,
    @Inject(AUTH_CONSTANTS.APPLICATION.USERS_AUTH_PROVIDERS_REPOSITORY_TOKEN)
    private readonly usersAuthProvidersRepository: IUsersAuthProvidersRepository,
    @Inject(AUTH_CONSTANTS.APPLICATION.PROVIDER_REPOSITORY_TOKEN)
    private readonly authProviderRepository: IAuthProviderRepository,
    @Inject(TRANSACTION_CONSTANTS.APPLICATION.MANAGER_TOKEN)
    private readonly tm: PropagatedTransaction<unknown>,
  ) {}

  public async getOAuthAuthorizeURL(): Promise<string> {
    const redirectURI = `${this.configService.get<string>(
      'APP_PROTOCOL',
    )}://${this.configService.get<string>('APP_DOMAIN')}/auth/github`;

    const url = this.githubClient.getOAuthAuthorizeURL(redirectURI);

    return url;
  }

  public async authorize(payload: IAuthorizeWithGithub): Promise<IJwtPair> {
    const connection = await this.tm.start();

    const callback = async (): Promise<IJwtPair> => {
      try {
        const accessToken = await this.githubClient.getAccessToken(
          payload.code,
        );

        const githubUser = await this.githubClient.getUser(accessToken);
        const githubEmail = await this.githubClient.getVerifiedPrimaryEmail(
          accessToken,
        );

        const user = await this.userService.findByEmail(githubEmail);

        if (!user) {
          const jwtPair = await this.signUp({
            email: githubEmail,
            githubId: githubUser.id,
            username: githubUser.login,
          });

          await this.tm.commit();

          return jwtPair;
        }

        const usersAuthProviders =
          await this.usersAuthProvidersRepository.findByUserIdAndProvider(
            user.id,
            AuthProviders.Github,
          );

        const jwtPair = await this.signIn({
          userId: user.id,
          candidateGithubId: githubUser.id,
          userGithubId: usersAuthProviders.providerUserId,
        });

        await this.tm.commit();

        return jwtPair;
      } catch (err) {
        await this.tm.rollback();

        throw err;
      }
    };

    return this.tm.run<Promise<IJwtPair>>(connection, callback);
  }

  public async signUp(payload: IGithubLocalSignUp): Promise<IJwtPair> {
    const password = this.cryptographyService.randomUUID();
    const hashedPassword = await this.cryptographyService.hash(password);

    const user = await this.userService.create({
      email: payload.email,
      password: hashedPassword,
      username: payload.username,
      confirmationStatus: UserConfirmationStatuses.Confirmed,
      diskSpace: USER_CONSTANTS.DOMAIN.DEFAULT_PLAN_AVAILABLE_SIZE_IN_BYTES,
    });
    const authProvider = await this.authProviderRepository.findByName(
      AuthProviders.Github,
    );

    await this.usersAuthProvidersRepository.create({
      userId: user.id,
      providerId: authProvider.id,
      providerUserId: String(payload.githubId),
    });

    await this.mailerService.sendGithubGeneratedPassword({
      password,
      receiver: user.email,
    });

    return this.jwtService.generatePair({ id: user.id });
  }

  public async signIn(payload: IGithubILocalSignIn): Promise<IJwtPair> {
    if (!payload.userGithubId) {
      throw AuthError.GithubIdNotLinked();
    }

    if (payload.userGithubId !== String(payload.candidateGithubId)) {
      throw AuthError.GithubIdsDoNotMatch();
    }

    return this.jwtService.generatePair({ id: payload.userId });
  }
}
