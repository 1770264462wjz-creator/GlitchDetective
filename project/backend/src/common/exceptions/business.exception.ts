import { HttpException } from '@nestjs/common';
import {
  ErrorCodeValue,
  ErrorMessage,
  codeToHttpStatus,
} from '../constants/error-code';

/**
 * 业务异常：携带业务 code，由 AllExceptionsFilter 统一转成
 * { code, message, data: null } 响应。
 */
export class BusinessException extends HttpException {
  constructor(code: ErrorCodeValue, message?: string) {
    super({ code, message: message ?? ErrorMessage[code] }, codeToHttpStatus(code));
  }
}
