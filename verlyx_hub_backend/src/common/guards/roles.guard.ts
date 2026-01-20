import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject('COMPANY_SERVICE') private companyService?: any,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Si hay CompanyService disponible, verificar roles por empresa
    if (this.companyService) {
      const companyId = request.companyId || request.params.id || request.params.companyId;
      
      if (companyId) {
        try {
          const hasRole = await this.companyService.userHasRole(
            user.sub,
            companyId,
            requiredRoles,
          );
          
          if (!hasRole) {
            throw new ForbiddenException(
              `Se requiere uno de los siguientes roles: ${requiredRoles.join(', ')}`,
            );
          }
          
          return true;
        } catch (error) {
          throw new ForbiddenException('Insufficient permissions');
        }
      }
    }
    
    // Fallback: verificar rol simple (legacy)
    const hasRole = requiredRoles.some((role) => user.role === role);
    
    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }
    
    return true;
  }
}
