import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './../src/app.module';
import { ConfigService } from '@nestjs/config';
import session from '@fastify/secure-session';

describe('AuthResolver (e2e)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    const config = app.get(ConfigService);

    await app.register(session, {
      key: Buffer.from(config.get<string>('SESSION_SECRET'), 'hex'),
    });

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  it('signUp => create the user and set session cookie', async () => {
    const username = 'John';
    const password = 'pass123';

    const query = `
		  mutation {
		    signUp(schema: {
		      username: "${username}",
		      password: "${password}" 
		    }) {
		      uuid
		      username
		    }	
		  }
		`;

    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query,
      },
    });

    const body = JSON.parse(response.body);

    let isSessionCookiePresent = false;

    for (const cookie of response.cookies) {
      if (cookie['name'] === 'session') {
        isSessionCookiePresent = true;
      }
    }

    expect(response.statusCode).toBe(200);
    expect(body.data.signUp.username).toMatch(username);
    expect(body.data.signUp.password).toBeUndefined();
    expect(isSessionCookiePresent).toBeTruthy();
  });

  it('signIn => create user and successfully to sign in', async () => {
    const username = 'John2';
    const password = 'pass1234';

    const signUpQuery = `
		  mutation {
		    signUp(schema: {
		      username: "${username}",
		      password: "${password}" 
		    }) {
		      uuid
		      username
		    }	
		  }
		`;

    const signUpResponse = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: signUpQuery,
      },
    });

    const signInQuery = `
		  mutation {
		    signIn(schema: {
		      username: "${username}",
		      password: "${password}" 
		    }) {
		      uuid
		      username
		    }	
		  }
		`;

    const signInResponse = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: signInQuery,
      },
    });

    let isSessionCookiePresent = false;

    for (const cookie of signUpResponse.cookies) {
      if (cookie['name'] === 'session') {
        isSessionCookiePresent = true;
      }
    }

    const body = JSON.parse(signInResponse.body);

    expect(signInResponse.statusCode).toBe(200);
    expect(body.data.signIn.username).toMatch(username);
    expect(body.data.signIn.password).toBeUndefined();
    expect(isSessionCookiePresent).toBeTruthy();
  });

  it('singOut => create user and then sign out', async () => {
    const username = 'John3';
    const password = 'pass12345';

    const signUpQuery = `
		  mutation {
		    signUp(schema: {
		      username: "${username}",
		      password: "${password}" 
		    }) {
		      uuid
		      username
		    }	
		  }
		`;

    const signUpResponse = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: signUpQuery,
      },
    });

    let sessionCookie: object;

    for (const cookie of signUpResponse.cookies) {
      if (cookie['name'] === 'session') {
        sessionCookie = cookie;
      }
    }

    const signOutQuery = `
		  mutation {
		    signOut 
		  }
		`;

    const signOutResponse = await app.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: signOutQuery,
      },
      cookies: {
        session: sessionCookie['value'],
      },
    });

    const body = JSON.parse(signOutResponse.body);

    expect(signOutResponse.statusCode).toBe(200);
    expect(body.data.signOut).toBeTruthy();
  });

  afterEach(async () => {
    await app.close();
  });
});
