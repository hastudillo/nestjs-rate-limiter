import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from './../src/app.module';
import { ConfigService } from '@nestjs/config';
import { EnvEnum } from '../src/common/env.enum';
import { authorizationHeader, basicAuthPrefix } from '../src/common/constants';

describe('PrivateController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/private (GET)', () => {
    const configService: ConfigService = app.get(ConfigService);
    return request(app.getHttpServer())
      .get('/private')
      .set({
        [authorizationHeader]: `${basicAuthPrefix} ${configService.get<string>(
          EnvEnum.AUTH_TOKEN,
        )}`,
      })
      .expect(200)
      .expect('Hello World!');
  });
});
