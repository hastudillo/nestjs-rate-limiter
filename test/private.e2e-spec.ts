import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { times } from 'async';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { authorizationHeader, basicAuthPrefix } from '../src/common/constants';
import { EnvEnum } from '../src/common/env.enum';

describe('PrivateController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/private/books/:bookId (GET)', (done) => {
    const configService: ConfigService = app.get(ConfigService);
    const parallelRuns = parseInt(
      configService.get<string>(EnvEnum.RATE_LIMIT_BY_TOKEN),
    );
    let actualRuns = 0;
    const asyncTask = () => {
      request(app.getHttpServer())
        .get('/private/books/000000000000000000000000')
        .set({
          [authorizationHeader]: `${basicAuthPrefix} ${configService.get<string>(
            EnvEnum.AUTH_TOKEN,
          )}`,
        })
        .expect(200)
        .end((err) => {
          actualRuns++;
          if (err) {
            return done(err);
          }
          if (actualRuns === parallelRuns) {
            done();
          }
        });
    };
    times(parallelRuns, asyncTask, done);
  });
});
