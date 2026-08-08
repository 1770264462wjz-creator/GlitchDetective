import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode, ErrorMessage } from '../constants/error-code';

/**
 * 全局异常过滤器：所有响应统一为 { code, message, data }。
 * - HttpException（含 BusinessException）：透传其携带的 code/message
 * - 未预期异常：记日志，返回 3001
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      let code: number = ErrorCode.INTERNAL_ERROR;
      let message = ErrorMessage[ErrorCode.INTERNAL_ERROR];

      if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        if (typeof body.code === 'number') {
          // 业务异常（BusinessException）：透传携带的 code/message
          code = body.code;
          if (typeof body.message === 'string') message = body.message;
        } else if (status === HttpStatus.BAD_REQUEST) {
          // ValidationPipe / 原生 BadRequestException：视为参数校验失败 1001
          code = ErrorCode.PARAM_INVALID;
          const raw = Array.isArray(body.message) ? body.message[0] : body.message;
          message = typeof raw === 'string' ? raw : ErrorMessage[ErrorCode.PARAM_INVALID];
        }
      } else if (typeof res === 'string') {
        message = res;
      }

      response.status(status).json({ code, message, data: null });
      return;
    }

    this.logger.error(
      `[${request.method} ${request.url}] unhandled exception`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: ErrorCode.INTERNAL_ERROR,
      message: '服务器内部错误',
      data: null,
    });
  }
}
