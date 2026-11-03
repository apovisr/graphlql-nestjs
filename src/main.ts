import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { appConfig, type AppConfig } from './config/app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const { port } = app.get<AppConfig>(appConfig.KEY);
  await app.listen(port);
  new Logger('Bootstrap').log(
    `Apollo Sandbox en http://localhost:${port}/graphql`,
  );
}
void bootstrap();
