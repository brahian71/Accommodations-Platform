// ================================
// 📁 hostal-norte-backend/src/controllers/admin/admin.auth.controller.ts
// 🔐 CONTROLADOR DE AUTENTICACIÓN ADMIN
// ================================

import { Request, Response } from 'express';
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); 
import { executeQuery } from '../../config/database';

// ================================
// 🔒 INTERFACES
// ================================

interface AdminLoginRequest {
  username: string;
  password: string;
}

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: 'owner' | 'manager' | 'staff';
  permissions: string[];
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

interface JWTPayload {
  userId: number;
  username: string;
  role: string;
  permissions: string[];
}

// ================================
// 🔑 CONFIGURACIÓN JWT
// ================================

const JWT_SECRET = process.env.JWT_SECRET || 'hostal_norte_admin_secret_key_2025';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// ================================
// 🔐 LOGIN DE ADMINISTRADOR
// ================================

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password }: AdminLoginRequest = req.body;

    console.log('🔐 Admin login attempt for user:', username);

    // Validaciones básicas
    if (!username || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Usuario y contraseña son requeridos',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Buscar usuario en la base de datos
    const userQuery = `
      SELECT 
        id,
        username,
        email,
        password_hash,
        role,
        permissions,
        is_active,
        last_login,
        created_at,
        updated_at
      FROM admin_users 
      WHERE username = $1 AND is_active = true
      LIMIT 1
    `;

    const userResult = await executeQuery(userQuery, [username]);

    if (userResult.rows.length === 0) {
      console.log('❌ Admin login failed: User not found:', username);
      return res.status(401).json({
        status: 'error',
        message: 'Credenciales inválidas',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const user = userResult.rows[0];

      // AGREGAR ESTOS LOGS:
      console.log('🔍 DEBUG: User found in database:', user.username);
      console.log('🔍 DEBUG: Password hash from DB:', user.password_hash);
      console.log('🔍 DEBUG: Password received:', password);
      console.log('🔍 DEBUG: Is active:', user.is_active);

      // Verificar contraseña
      console.log('🔍 DEBUG: About to compare password...');
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      console.log('🔍 DEBUG: Password comparison result:', isPasswordValid);


    if (!isPasswordValid) {
      console.log('❌ Admin login failed: Invalid password for user:', username);
      
      return res.status(401).json({
        status: 'error',
        message: 'Credenciales inválidas',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Actualizar último login
    await updateLastLogin(user.id);

    // Crear token JWT
    const tokenPayload: JWTPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      permissions: Array.isArray(user.permissions) ? user.permissions : []
    };

    const token = jwt.sign(
      tokenPayload,
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'hostal-norte-admin',
        subject: user.id.toString()
      }
    );

    // Preparar datos del usuario (sin password)
    const userData: AdminUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
      isActive: user.is_active,
      lastLogin: new Date().toISOString(),
      createdAt: user.created_at
    };

    console.log('✅ Admin login successful for user:', username, 'Role:', user.role);

    res.json({
      status: 'success',
      message: 'Login exitoso',
      data: {
        user: userData,
        token: token,
        expiresIn: 24 * 60 * 60 * 1000 // 24 horas en milisegundos
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en login de admin:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Error interno'
    });
  }
};

// ================================
// ✅ VALIDACIÓN DE TOKEN
// ================================

export const validateToken = async (req: Request, res: Response) => {
  try {
    // El token ya fue validado por el middleware, obtener datos del usuario
    const userId = (req as any).adminUser?.userId;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    }

    // Obtener datos actualizados del usuario
    const userQuery = `
      SELECT 
        id,
        username,
        email,
        role,
        permissions,
        is_active,
        last_login,
        created_at
      FROM admin_users 
      WHERE id = $1 AND is_active = true
      LIMIT 1
    `;

    const userResult = await executeQuery(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Usuario no encontrado o inactivo',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = userResult.rows[0];

    const userData: AdminUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at
    };

    console.log('✅ Token validated for user:', user.username);

    res.json({
      status: 'success',
      message: 'Token válido',
      data: userData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error validando token:', error);
    res.status(401).json({
      status: 'error',
      message: 'Token inválido',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Token inválido'
    });
  }
};

// ================================
// 🚪 LOGOUT
// ================================

export const logout = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).adminUser?.userId;

    console.log('🚪 Admin logout for user ID:', userId);

    res.json({
      status: 'success',
      message: 'Logout exitoso',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en logout:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error en logout',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Error interno'
    });
  }
};

// ================================
// 🛠️ FUNCIONES AUXILIARES
// ================================

async function updateLastLogin(userId: number): Promise<void> {
  try {
    await executeQuery(
      'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  } catch (error) {
    console.error('Error updating last login:', error);
  }
}

// ================================
// 🔧 UTILIDADES JWT
// ================================

export const verifyAdminToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Error verifying JWT token:', error);
    return null;
  }
};

// ================================
// 🎯 EXPORTS
// ================================

export default {
  login,
  validateToken,
  logout,
  verifyAdminToken
};