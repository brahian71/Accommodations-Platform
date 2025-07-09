// ================================
// 📁 src/environments/environment.ts
// 🔧 CONFIGURACIÓN PARA USAR API REAL DE AVAILABILITY
// ================================

export const environment = {
  production: false,
  
  // ✅ API Configuration - USAR BACKEND REAL
  apiUrl: 'http://localhost:3001',
  useRealAPI: true, // ✅ IMPORTANTE: true para usar endpoints reales
  
  // Backend endpoints
  endpoints: {
    rooms: '/api/rooms',
    availability: '/api/availability',
    bookings: '/api/bookings',
    establishment: '/api/establishment'
  },
  
  // Configuración adicional
  app: {
    name: 'Hostal Norte Armenia',
    version: '1.0.0'
  },
  
  // Features flags
  features: {
    realTimeAvailability: true,
    whatsappIntegration: true,
    adminPanel: false // Próximamente
  }
};