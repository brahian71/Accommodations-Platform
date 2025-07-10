// 📁 hostal-norte-backend/src/routes/establishment.routes.ts

import { Router } from 'express';
import { 
  getEstablishmentInfo, 
  updateEstablishmentInfo 
} from '../controllers/establishment.controller';

const router = Router();

// ================================
// 🏨 RUTAS DEL ESTABLECIMIENTO
// ================================

/**
 * GET /api/establishment
 * Obtener información completa del establecimiento
 */
router.get('/', getEstablishmentInfo);

/**
 * PUT /api/establishment
 * Actualizar información del establecimiento (Para Admin Panel)
 */
router.put('/', updateEstablishmentInfo);

/**
 * GET /api/establishment/info  
 * Alias para compatibilidad
 */
router.get('/info', getEstablishmentInfo);

export default router;