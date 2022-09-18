import { Inject, Injectable } from '@nestjs/common';

import { USER_REPOSITORY_TOKEN } from './constants/user.constants';
import { UserConfirmationStatus } from './enums/user-confirmation-status.enum';

import { UserNotFoundByEmailError } from './errors/user-not-found-by-email.error';
import { UserNotFoundByUsernameError } from './errors/user-not-found-by-username.error';
import { UserNotFoundByUuidError } from './errors/user-not-found-by-uuid.error';

import { CreateUser } from './interfaces/create-user.interface';
import { UserRepositoryInterface } from './interfaces/user-repository.interface';

import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryInterface<User>,
  ) {}

  public async findSingleByUuid(uuid: string): Promise<User> {
    const user = await this.userRepository.findSingleByUuid(uuid);

    return user;
  }

  public async findSingleByUuidWithException(uuid: string): Promise<User> {
    const user = await this.userRepository.findSingleByUuid(uuid);

    if (!user) {
      throw new UserNotFoundByUuidError();
    }

    return user;
  }

  public async findSingleByUsernameWithException(
    username: string,
  ): Promise<User> {
    const user = await this.userRepository.findSingleByUsername(username);

    if (!user) {
      throw new UserNotFoundByUsernameError();
    }

    return user;
  }

  public async findSingleByEmailWithException(email: string): Promise<User> {
    const user = await this.userRepository.findSingleByEmail(email);

    if (!user) {
      throw new UserNotFoundByEmailError();
    }

    return user;
  }

  public async mailUsed(email: string): Promise<boolean> {
    const user = await this.userRepository.findSingleByEmail(email);

    const mailUsed = Boolean(user);

    return mailUsed;
  }

  public async createSingleForSignUp(data: CreateUser): Promise<User> {
    const user = await this.userRepository.createSinglePending(data);

    return user;
  }

  public async updateConfirmationStatus(
    uuid: string,
    status: UserConfirmationStatus,
  ): Promise<boolean> {
    const updated = await this.userRepository.updateConfirmationStatus(
      uuid,
      status,
    );

    return updated;
  }
}
