import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MercuriusDriver, MercuriusDriverConfig } from '@nestjs/mercurius';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { join } from 'node:path';
import { AlsModule } from './als/als.module';
import { JwtModule } from './jwt/jwt.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { FileModule } from './file/file.module';
import { HttpModule } from './http/http.module';
import { CacheModule } from './cache/cache.module';
import { EventModule } from './event/event.module';
import { MailerModule } from './mailer/mailer.module';
import { GithubModule } from './github/github.module';
import { PaymentModule } from './payment/payment.module';
import { TransactionModule } from './transaction/transaction.module';
import { CryptographyModule } from './cryptography/cryptography.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      envFilePath: ['.env', '.env.development'],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService): ThrottlerModuleOptions => ({
        ttl: config.get<number>('THROTTLER_TTL'),
        limit: config.get<number>('THROTTLER_LIMIT'),
      }),
      inject: [ConfigService],
    }),
    GraphQLModule.forRootAsync<MercuriusDriverConfig>({
      driver: MercuriusDriver,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        driver: MercuriusDriver,
        autoSchemaFile: join(
          process.cwd(),
          config.get<string>('GRAPHQL_SCHEMA_PATH'),
        ),
        graphiql: true,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        type: 'postgres',
        logging: true,
        host: config.get<string>('DATABASE_HOST'),
        port: config.get<number>('DATABASE_PORT'),
        database: config.get<string>('DATABASE_NAME'),
        username: config.get<string>('DATABASE_USERNAME'),
        password: config.get<string>('DATABASE_PASSWORD'),
        autoLoadEntities: true,
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    JwtModule,
    EventEmitterModule.forRoot(),
    UserModule,
    AuthModule,
    MailerModule,
    CacheModule,
    FileModule,
    CryptographyModule,
    PaymentModule,
    HttpModule,
    EventModule,
    GithubModule,
    AlsModule,
    TransactionModule,
  ],
})
export class AppModule {}
