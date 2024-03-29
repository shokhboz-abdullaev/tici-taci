import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SocketIoAdapter } from './shared/config/adapters/socket.adapter';
import { EnvironmentVariables } from './shared/config/dto/env-variables.dto';
import { SwaggerConfig } from './shared/config/swagger/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  SwaggerConfig(app);

  const configService: ConfigService<EnvironmentVariables> =
    app.get(ConfigService);

  app.enableCors();
  app.useWebSocketAdapter(new SocketIoAdapter(app, configService));

  await app.listen(configService.get('PORT'));
}
bootstrap();
