import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || "gaes_super_secret_jwt_key_2026";

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('⚠️ [SECURITY WARNING] JWT_SECRET no está definida en las variables de entorno de producción. Configure una clave segura de alta entropía en .env.');
}

export interface AuthenticatedUser {
  id: string | number;
  email: string;
  name: string;
  role: string;
  companyId?: string;
}

// Extender la interfaz Request de Express para incluir el usuario autenticado
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware centralizado para verificar tokens JWT en peticiones HTTP.
 * 
 * - Extrae el token de Authorization: Bearer <token>, x-access-token o query param.
 * - Verifica la firma criptográfica y expiración usando JWT_SECRET.
 * - Adjunta el payload decodificado a req.user.
 * - Permite explícitamente rutas públicas de inicio de sesión (/login).
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  // Permitir endpoints públicos de autenticación (ej. /login o /auth/login)
  if ((req.path === '/login' || req.path === '/auth/login') && req.method === 'POST') {
    return next();
  }

  const authHeader = req.headers['authorization'];
  let token: string | undefined;

  if (authHeader && typeof authHeader === 'string') {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
      token = parts[1];
    } else {
      token = authHeader;
    }
  } else if (req.headers['x-access-token'] && typeof req.headers['x-access-token'] === 'string') {
    token = req.headers['x-access-token'];
  } else if (req.query?.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      error: 'Acceso no autorizado: Se requiere token de autenticación (Bearer token).'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err: any) {
    const isExpired = err?.name === 'TokenExpiredError';
    return res.status(403).json({
      error: isExpired 
        ? 'Acceso denegado: El token de autenticación ha expirado.' 
        : 'Acceso denegado: Token de autenticación inválido.',
      details: err?.message
    });
  }
}

/**
 * Middleware para exigir roles específicos
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Acceso no autorizado: Usuario no autenticado.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Acceso denegado: Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}.`
      });
    }

    next();
  };
}

/**
 * Middleware para exigir rol de Super Administrador
 */
export const requireSuperAdmin = requireRole('Super Administrador');
