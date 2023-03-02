import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Args, Query, Mutation, Resolver } from '@nestjs/graphql';

import { MailIsInUseError } from './errors/mail-is-in-use.error';
import { EmailNotConfirmedError } from './errors/email-not-confirmed.error';
import { PasswordsNotMatchingError } from './errors/passwords-not-matching.error';
import { EmailAlreadyConfirmedError } from './errors/email-already-confirmed.error';
import { InvalidConfirmationHashError } from './errors/invalid-confirmation-hash.error';
import { UserNotFoundByEmailError } from '../user/errors/user-not-found-by-email.error';

import { SignUpSchema } from './schema/sign-up.schema';
import { SignInSchema } from './schema/sign-in.schema';

import { AuthService } from './services/auth.service';
import { UserNotFoundByIdError } from 'src/user/errors/user-not-found-by-uuid.error';
import { UserEntityResponse } from 'src/user/responses/user-entity.response';
import { JwtPairResponse } from './responses/jwt-pair.response';
import { ConfirmEmailResponse } from './responses/confirm-email.response';
import { ResendConfirmationEmailResponse } from './responses/resend-confirmation-email.response';
import { ObtainGithubOAuthURLResponse } from './responses/obtain-github-oauth-url.response';
import { GithubAuthService } from './services/github-auth.service';
import { AuthorizeWithGithubSchema } from './schema/authorize-with-github.schema';
import { GithubIdNotLinkedError } from './errors/github-id-not-linked.error';
import { GithubIdsDoNotMatchError } from './errors/github-ids-do-not-match.error';

@Resolver()
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly githubAuthService: GithubAuthService,
  ) {}

  @Query(() => ObtainGithubOAuthURLResponse, {
    name: 'obtainOAuthAuthorizeGithubURL',
  })
  public async obtainGithubOAuthURL(): Promise<ObtainGithubOAuthURLResponse> {
    try {
      const url = await this.githubAuthService.obtainOAuthAuthorizeURL();

      const response = new ObtainGithubOAuthURLResponse(url);

      return response;
    } catch (err) {
      throw new BadRequestException();
    }
  }

  @Mutation(() => JwtPairResponse, { name: 'authorizeWithGithub' })
  public async authorizeWithGithub(
    @Args('schema') schema: AuthorizeWithGithubSchema,
  ): Promise<JwtPairResponse> {
    try {
      const pair = await this.githubAuthService.authorize(schema);

      const response = new JwtPairResponse(pair);

      return response;
    } catch (err) {
      if (
        err instanceof GithubIdNotLinkedError ||
        err instanceof GithubIdsDoNotMatchError
      ) {
        throw new UnauthorizedException(err.message);
      }

      throw new BadRequestException();
    }
  }

  @Mutation(() => UserEntityResponse, { name: 'signUp' })
  public async signUp(
    @Args('schema') schema: SignUpSchema,
  ): Promise<UserEntityResponse> {
    try {
      const user = await this.authService.signUp(schema);

      const response = new UserEntityResponse(user);

      return response;
    } catch (err) {
      if (err instanceof MailIsInUseError) {
        throw new ConflictException(err);
      }

      throw new BadRequestException();
    }
  }

  @Mutation(() => JwtPairResponse, { name: 'signIn' })
  public async signIn(
    @Args('schema') schema: SignInSchema,
  ): Promise<JwtPairResponse> {
    try {
      const pair = await this.authService.singIn(schema);

      const response = new JwtPairResponse(pair);

      return response;
    } catch (err) {
      if (err instanceof PasswordsNotMatchingError) {
        throw new UnauthorizedException(err);
      }
      if (err instanceof UserNotFoundByEmailError) {
        throw new NotFoundException(err);
      }
      if (err instanceof EmailNotConfirmedError) {
        throw new ForbiddenException(err);
      }

      throw new BadRequestException();
    }
  }

  @Mutation(() => ConfirmEmailResponse, { name: 'confirmEmail' })
  public async confirmEmail(
    @Args('hash') hash: string,
  ): Promise<ConfirmEmailResponse> {
    try {
      const confirmed = await this.authService.confirmEmail(hash);

      const response = new ConfirmEmailResponse(confirmed);

      return response;
    } catch (err) {
      if (
        err instanceof InvalidConfirmationHashError ||
        err instanceof EmailAlreadyConfirmedError
      ) {
        throw new ConflictException(err);
      }
      if (err instanceof UserNotFoundByIdError) {
        throw new NotFoundException(err);
      }

      throw new BadRequestException();
    }
  }

  @Mutation(() => ResendConfirmationEmailResponse, {
    name: 'resendConfirmationEmail',
  })
  public async resendConfirmationEmail(
    @Args('email') email: string,
  ): Promise<ResendConfirmationEmailResponse> {
    try {
      const resent = await this.authService.resendConfirmationEmail(email);

      const response = new ResendConfirmationEmailResponse(resent);

      return response;
    } catch (err) {
      if (err instanceof EmailAlreadyConfirmedError) {
        throw new ConflictException(err);
      }
      if (err instanceof UserNotFoundByEmailError) {
        throw new NotFoundException(err);
      }

      throw new BadRequestException();
    }
  }
}
