import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse: any = exception.getResponse();
      message = exceptionResponse.message || exception.message;
      code = 'HTTP_ERROR';
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle Prisma Errors
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'A record with this data already exists.';
        code = 'DUPLICATE_ENTRY';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found.';
        code = 'RECORD_NOT_FOUND';
      } else {
        status = HttpStatus.BAD_REQUEST;
        message = exception.message.replace(/\n/g, ' ');
        code = 'DATABASE_ERROR';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    console.error(`[Exception] ${request.method} ${request.url}`, exception);

    response.status(status).json({
      statusCode: status,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
