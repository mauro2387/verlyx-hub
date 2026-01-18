import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para extraer company_id del header o query
 * y agregarlo al objeto request
 */
@Injectable()
export class CompanyContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Intentar obtener company_id de diferentes fuentes
    const companyId = 
      req.headers['x-company-id'] as string ||
      req.query.companyId as string ||
      req.body?.companyId;

    if (companyId) {
      // Agregar company_id al request para uso posterior
      (req as any).companyId = companyId;
    }

    next();
  }
}
