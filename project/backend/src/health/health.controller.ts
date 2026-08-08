import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check(): Record<string, unknown> {
    return {
      status: 'ok',
      service: 'glitch-detective-backend',
      timestamp: new Date().toISOString(),
    };
  }
}