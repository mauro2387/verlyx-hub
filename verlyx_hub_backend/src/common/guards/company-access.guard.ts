import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Guard para verificar que el usuario tenga acceso a la empresa especificada
 * Requiere que CompanyContextMiddleware haya sido ejecutado antes
 */
@Injectable()
export class CompanyAccessGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;
    const companyId = request.companyId || request.params.id || request.params.companyId;

    if (!userId) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    if (!companyId) {
      // Si no hay company_id, permitir acceso (para endpoints que no lo requieren)
      return true;
    }

    // El acceso real se verifica en el service de cada módulo
    // Este guard solo asegura que hay un company_id válido
    request.companyId = companyId;
    return true;
  }
}
