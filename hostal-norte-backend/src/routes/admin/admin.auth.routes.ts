// ================================
// 📁 hostal-norte-backend/src/routes/admin/admin.auth.routes.ts
// 🛤️ RUTAS DE AUTENTICACIÓN ADMIN
// ================================

import { Router } from 'express';
import adminAuthController from '../../controllers/admin/admin.auth.controller';
import { authenticateAdmin } from '../../middleware/admin.auth.middleware';

const router = Router();

// ================================
// 🔐 RUTAS PÚBLICAS (Sin autenticación requerida)
// ================================

/**
 * @route   POST /api/admin/auth/login
 * @desc    Login de administrador
 * @access  Public
 * @body    { username: string, password: string }
 */
router.post('/login', adminAuthController.login);

// ================================
// 🔒 RUTAS PROTEGIDAS (Requieren autenticación)
// ================================

/**
 * @route   GET /api/admin/auth/validate
 * @desc    Validar token JWT actual
 * @access  Private (Admin)
 * @headers Authorization: Bearer <token>
 */
router.get('/validate', authenticateAdmin, adminAuthController.validateToken);

/**
 * @route   POST /api/admin/auth/logout
 * @desc    Logout de administrador
 * @access  Private (Admin)
 * @headers Authorization: Bearer <token>
 */
router.post('/logout', authenticateAdmin, adminAuthController.logout);

// ================================
// 🔍 RUTA DE INFORMACIÓN
// ================================

/**
 * @route   GET /api/admin/auth
 * @desc    Información de endpoints de autenticación
 * @access  Public
 */
router.get('/', (req, res) => {
  res.json({
    message: 'Admin Authentication API',
    version: '1.0.0',
    endpoints: {
      login: {
        method: 'POST',
        path: '/api/admin/auth/login',
        description: 'Iniciar sesión como administrador',
        body: {
          username: 'string (required)',
          password: 'string (required)'
        },
        example: {
          username: 'admin',
          password: 'admin123'
        }
      },
      validate: {
        method: 'GET',
        path: '/api/admin/auth/validate',
        description: 'Validar token JWT actual',
        headers: {
          Authorization: 'Bearer <token>'
        }
      },
      logout: {
        method: 'POST',
        path: '/api/admin/auth/logout',
        description: 'Cerrar sesión',
        headers: {
          Authorization: 'Bearer <token>'
        }
      }
    },
    security: {
      tokenType: 'JWT',
      expiresIn: '24h',
      header: 'Authorization: Bearer <token>'
    }
  });
});

export default router;