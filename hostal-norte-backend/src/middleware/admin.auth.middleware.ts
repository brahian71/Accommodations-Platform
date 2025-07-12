// ================================
// 📁 hostal-norte-backend/src/middleware/admin.auth.middleware.ts
// 🛡️ MIDDLEWARE DE AUTENTICACIÓN ADMIN
// ================================

import { Request, Response, NextFunction } from 'express';
import { verifyAdminToken } from '../controllers/admin/admin.auth.controller';
import { executeQuery } from '../config/database';

// ================================
// 🔒 INTERFACES Y TIPOS
// ================================

interface AdminUser {
  userId: number;
  username: string;
  role: 'owner' | 'manager' | 'staff';
  permissions: string[];
}

// Extender Request para incluir adminUser
declare global {
  namespace Express {
    interface Request {
      adminUser?: AdminUser;
    }
  }
}

// ================================
// 🔐 MIDDLEWARE PRINCIPAL DE AUTENTICACIÓN
// ================================

export const authenticateAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('🛡️ Admin auth middleware - checking request to:', req.path);

    // Extraer token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      console.log('❌ Admin auth: No Authorization header found');
      return res.status(401).json({
        status: 'error',
        message: 'Token de acceso requerido',
        code: 'NO_TOKEN'
      });
    }

    // Verificar formato del header (Bearer <token>)
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      console.log('❌ Admin auth: Invalid Authorization header format');
      return res.status(401).json({
        status: 'error',
        message: 'Formato de token inválido',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    const token = tokenParts[1];

    // Verificar token JWT
    const decoded = verifyAdminToken(token);
    if (!decoded) {
      console.log('❌ Admin auth: Invalid or expired token');
      return res.status(401).json({
        status: 'error',
        message: 'Token inválido o expirado',
        code: 'INVALID_TOKEN'
      });
    }

    console.log('🔍 Admin auth: Token decoded for user:', decoded.username);

    // Verificar que el usuario sigue activo en la base de datos
    const userCheck = await verifyUserActive(decoded.userId);
    if (!userCheck.isActive) {
      console.log('❌ Admin auth: User inactive or not found:', decoded.username);
      return res.status(401).json({
        status: 'error',
        message: 'Usuario inactivo o no encontrado',
        code: 'USER_INACTIVE'
      });
    }

    // Añadir información del usuario al request
    req.adminUser = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role as 'owner' | 'manager' | 'staff',
      permissions: userCheck.permissions || decoded.permissions
    };

    console.log('✅ Admin auth: Authentication successful for user:', decoded.username);
    next();

  } catch (error) {
    console.error('❌ Admin auth middleware error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error de autenticación',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Error interno'
    });
  }
};

// ================================
// 🔒 MIDDLEWARE DE PERMISOS
// ================================

export const requirePermissions = (requiredPermissions: string[], requireAll: boolean = false) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const adminUser = req.adminUser;

    if (!adminUser) {
      return res.status(401).json({
        status: 'error',
        message: 'Usuario no autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    console.log('🔍 Checking permissions for user:', adminUser.username);
    console.log('🔍 Required permissions:', requiredPermissions);
    console.log('🔍 User permissions:', adminUser.permissions);

    // Los owners tienen todos los permisos
    if (adminUser.role === 'owner') {
      console.log('✅ Permission granted: User is owner');
      return next();
    }

    // Verificar permisos específicos
    const hasPermissions = requireAll 
      ? requiredPermissions.every(permission => adminUser.permissions.includes(permission))
      : requiredPermissions.some(permission => adminUser.permissions.includes(permission));

    if (!hasPermissions) {
      console.log('❌ Permission denied for user:', adminUser.username);
      return res.status(403).json({
        status: 'error',
        message: 'Permisos insuficientes',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: requiredPermissions,
        userPermissions: adminUser.permissions
      });
    }

    console.log('✅ Permission granted for user:', adminUser.username);
    next();
  };
};

// ================================
// 👑 MIDDLEWARE DE ROLES
// ================================

export const requireRoles = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const adminUser = req.adminUser;

    if (!adminUser) {
      return res.status(401).json({
        status: 'error',
        message: 'Usuario no autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    console.log('🔍 Checking role for user:', adminUser.username, 'Role:', adminUser.role);
    console.log('🔍 Allowed roles:', allowedRoles);

    if (!allowedRoles.includes(adminUser.role)) {
      console.log('❌ Role access denied for user:', adminUser.username);
      return res.status(403).json({
        status: 'error',
        message: 'Rol insuficiente para esta acción',
        code: 'INSUFFICIENT_ROLE',
        required: allowedRoles,
        userRole: adminUser.role
      });
    }

    console.log('✅ Role access granted for user:', adminUser.username);
    next();
  };
};

// ================================
// 👑 MIDDLEWARE SOLO PARA OWNERS
// ================================

export const requireOwner = (req: Request, res: Response, next: NextFunction) => {
  const adminUser = req.adminUser;

  if (!adminUser) {
    return res.status(401).json({
      status: 'error',
      message: 'Usuario no autenticado',
      code: 'NOT_AUTHENTICATED'
    });
  }

  if (adminUser.role !== 'owner') {
    console.log('❌ Owner access denied for user:', adminUser.username, 'Role:', adminUser.role);
    return res.status(403).json({
      status: 'error',
      message: 'Esta acción requiere permisos de propietario',
      code: 'OWNER_REQUIRED'
    });
  }

  console.log('✅ Owner access granted for user:', adminUser.username);
  next();
};

// ================================
// 🛠️ FUNCIONES AUXILIARES
// ================================

async function verifyUserActive(userId: number): Promise<{ isActive: boolean; permissions?: string[] }> {
  try {
    const query = `
      SELECT 
        is_active,
        permissions
      FROM admin_users 
      WHERE id = $1
      LIMIT 1
    `;

    const result = await executeQuery(query, [userId]);

    if (result.rows.length === 0) {
      return { isActive: false };
    }

    const user = result.rows[0];
    return {
      isActive: user.is_active,
      permissions: Array.isArray(user.permissions) ? user.permissions : []
    };

  } catch (error) {
    console.error('Error verifying user active status:', error);
    return { isActive: false };
  }
}

// ================================
// 🔧 UTILIDADES DE PERMISOS
// ================================

export const hasPermission = (userPermissions: string[], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission);
};

export const hasAnyPermission = (userPermissions: string[], requiredPermissions: string[]): boolean => {
  return requiredPermissions.some(permission => userPermissions.includes(permission));
};

export const hasAllPermissions = (userPermissions: string[], requiredPermissions: string[]): boolean => {
  return requiredPermissions.every(permission => userPermissions.includes(permission));
};

// ================================
// 🎯 EXPORTS
// ================================

export default {
  authenticateAdmin,
  requirePermissions,
  requireRoles,
  requireOwner,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions
};