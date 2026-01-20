import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorador para obtener el company_id del request
 * Uso: @CompanyId() companyId: string
 */
export const CompanyId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.companyId || request.params.id || request.params.companyId;
  },
);

/**
 * Decorador para obtener todo el contexto de la empresa
 * Uso: @CompanyContext() context: { companyId: string, userId: string }
 */
export const CompanyContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return {
      companyId: request.companyId || request.params.id || request.params.companyId,
      userId: request.user?.sub,
    };
  },
);
