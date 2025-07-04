// ================================
// 📁 src/app/core/data/rooms-data.ts
// ================================

import { Room, RoomType, BedType, BathroomType, RoomAmenityType } from '../models/room.interface';

export const ROOMS_DATA: Room[] = [
  // Habitación 1 - Basada en "Habitación Cómoda Norte Centro"
  {
    id: 'room-1',
    roomNumber: 'Habitación 1',
    name: 'Habitación Cómoda Estándar',
    description: 'Habitación privada perfecta para viajeros de negocios o turistas individuales. Cuenta con todas las comodidades necesarias para una estancia confortable en el corazón de Armenia.',
    
    roomType: 'doble',
    bathroomType: 'privado',
    
    maxGuests: 2,
    beds: [
      { type: 'doble', quantity: 1 }
    ],
    
    area: 15,
    floor: 2,
    hasWindow: true,
    windowView: 'calle',
    
    amenities: [
      'aire-acondicionado',
      'tv-cable',
      'escritorio',
      'armario',
      'bano-privado',
      'ducha-agua-caliente',
      'toallas-incluidas'
    ] as RoomAmenityType[],
    
    features: [
      'Baño privado',
      'Ventana exterior', 
      'Armario amplio',
      'Escritorio de trabajo',
      'Iluminación LED'
    ],
    
    pricing: {
      basePrice: 15000,
      currency: 'COP',
    },
    
    images: {
      main: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop',
      gallery: [
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop'
      ]
    },
    
    availability: {
      isActive: true,
      isAvailable: true,
      minimumStay: 1,
      maximumStay: 30
    },
    
    stats: {
      rating: 4.9,
      reviewCount: 127,
      bookingCount: 234,
      occupancyRate: 85
    },
    
    createdAt: '2022-01-15T00:00:00.000Z',
    updatedAt: '2024-06-10T00:00:00.000Z'
  },

  // Habitación 2 - Basada en "Apartamento La Secreta" 
  {
    id: 'room-2',
    roomNumber: 'Habitación 2',
    name: 'Habitación Familiar Superior',
    description: 'Espaciosa habitación ideal para familias o grupos de amigos. Cuenta con espacio adicional y comodidades extra para una estancia cómoda de varios huéspedes.',
    
    roomType: 'familiar',
    bathroomType: 'privado',
    
    maxGuests: 4,
    beds: [
      { type: 'queen', quantity: 1 },
      { type: 'individual', quantity: 2 }
    ],
    
    area: 25,
    floor: 2,
    hasWindow: true,
    windowView: 'jardin',
    
    amenities: [
      'aire-acondicionado',
      'tv-smart',
      'escritorio',
      'armario',
      'minibar',
      'bano-privado',
      'ducha-agua-caliente',
      'toallas-incluidas',
      'kit-aseo'
    ] as RoomAmenityType[],
    
    features: [
      'Espacio amplio para 4 personas',
      'Vista al jardín interno',
      'Área de estar',
      'Armario doble',
      'Zona de trabajo'
    ],
    
    pricing: {
      basePrice: 25000,
      currency: 'COP',
    },
    
    images: {
      main: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
      gallery: [
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop'
      ]
    },
    
    availability: {
      isActive: true,
      isAvailable: true,
      minimumStay: 1,
      maximumStay: 45
    },
    
    stats: {
      rating: 4.8,
      reviewCount: 89,
      bookingCount: 156,
      occupancyRate: 78
    },
    
    createdAt: '2022-02-20T00:00:00.000Z',
    updatedAt: '2024-06-08T00:00:00.000Z'
  },

  // Habitación 3 - Basada en "Studio Bosques de Pinares"
  {
    id: 'room-3',
    roomNumber: 'Habitación 3', 
    name: 'Suite Deluxe con Balcón',
    description: 'Moderna suite con concepto abierto y balcón privado. Perfecta para huéspedes que buscan comodidad premium y un espacio de relajación con vista.',
    
    roomType: 'suite',
    bathroomType: 'privado',
    
    maxGuests: 2,
    beds: [
      { type: 'king', quantity: 1 }
    ],
    
    area: 30,
    floor: 3,
    hasWindow: true,
    windowView: 'terraza',
    
    amenities: [
      'aire-acondicionado',
      'tv-smart',
      'escritorio',
      'silla-trabajo',
      'armario',
      'caja-fuerte',
      'minibar',
      'cafetera',
      'balcon',
      'bano-privado',
      'ducha-agua-caliente',
      'secador-pelo',
      'toallas-incluidas',
      'kit-aseo'
    ] as RoomAmenityType[],
    
    features: [
      'Concepto abierto moderno',
      'Balcón privado con vista',
      'Zona de estar integrada',
      'Escritorio ejecutivo',
      'Iluminación ambiental'
    ],
    
    pricing: {
      basePrice: 35000,
      currency: 'COP',
    },
    
    images: {
      main: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop',
      gallery: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop'
      ]
    },
    
    availability: {
      isActive: true,
      isAvailable: true,
      minimumStay: 2,
      maximumStay: 60
    },
    
    stats: {
      rating: 4.7,
      reviewCount: 203,
      bookingCount: 298,
      occupancyRate: 82
    },
    
    createdAt: '2022-03-10T00:00:00.000Z',
    updatedAt: '2024-06-12T00:00:00.000Z'
  },

  // Habitación 4 - Basada en "Habitación Ejecutiva Villa Liliana"
  {
    id: 'room-4',
    roomNumber: 'Habitación 4',
    name: 'Habitación Ejecutiva Business',
    description: 'Habitación diseñada especialmente para viajeros de negocios. Cuenta con espacio de trabajo optimizado y todas las comodidades necesarias para productividad y descanso.',
    
    roomType: 'doble',
    bathroomType: 'privado',
    
    maxGuests: 2,
    beds: [
      { type: 'queen', quantity: 1 }
    ],
    
    area: 20,
    floor: 4,
    hasWindow: true,
    windowView: 'calle',
    
    amenities: [
      'aire-acondicionado',
      'tv-smart',
      'escritorio',
      'silla-trabajo',
      'armario',
      'caja-fuerte',
      'bano-privado',
      'ducha-agua-caliente',
      'secador-pelo',
      'toallas-incluidas',
      'kit-aseo',
      'blackout-curtains'
    ] as RoomAmenityType[],
    
    features: [
      'Escritorio ejecutivo amplio',
      'Silla ergonómica',
      'Iluminación LED de trabajo',
      'Cortinas blackout',
      'Ambiente profesional'
    ],
    
    pricing: {
      basePrice: 14000,
      currency: 'COP',
    },
    
    images: {
      main: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop',
      gallery: [
        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop'
      ]
    },
    
    availability: {
      isActive: true,
      isAvailable: true,
      minimumStay: 1,
      maximumStay: 90
    },
    
    stats: {
      rating: 4.6,
      reviewCount: 94,
      bookingCount: 187,
      occupancyRate: 71
    },
    
    createdAt: '2022-05-01T00:00:00.000Z',
    updatedAt: '2024-06-14T00:00:00.000Z'
  },

  // Habitación 5 - Basada en "Penthouse Norte Premium" 
  {
    id: 'room-5',
    roomNumber: 'Habitación 5',
    name: 'Suite Premium Vista Panorámica',
    description: 'Nuestra suite más exclusiva con vista panorámica de Armenia y las montañas del Quindío. Ideal para ocasiones especiales y huéspedes que buscan una experiencia de lujo.',
    
    roomType: 'suite',
    bathroomType: 'privado',
    
    maxGuests: 3,
    beds: [
      { type: 'king', quantity: 1 },
      { type: 'sofa-cama', quantity: 1 }
    ],
    
    area: 35,
    floor: 5,
    hasWindow: true,
    windowView: 'terraza',
    
    amenities: [
      'aire-acondicionado',
      'tv-smart',
      'escritorio',
      'silla-trabajo',
      'armario',
      'caja-fuerte',
      'minibar',
      'cafetera',
      'balcon',
      'bano-privado',
      'ducha-agua-caliente',
      'secador-pelo',
      'toallas-incluidas',
      'kit-aseo',
      'blackout-curtains'
    ] as RoomAmenityType[],
    
    features: [
      'Vista panorámica de Armenia',
      'Terraza privada',
      'Sala de estar premium',
      'Decoración de lujo',
      'Espacio para ocasiones especiales'
    ],
    
    pricing: {
      basePrice: 20000,
      currency: 'COP',
    },
    
    images: {
      main: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop',
      gallery: [
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop'
      ]
    },
    
    availability: {
      isActive: true,
      isAvailable: true,
      minimumStay: 2,
      maximumStay: 30
    },
    
    stats: {
      rating: 4.9,
      reviewCount: 67,
      bookingCount: 98,
      occupancyRate: 65
    },
    
    createdAt: '2022-01-30T00:00:00.000Z',
    updatedAt: '2024-06-13T00:00:00.000Z'
  }
];

// ================================
// 🏷️ DATOS DERIVADOS PARA COMPATIBILIDAD
// ================================

// Habitaciones destacadas para la página de inicio
export const FEATURED_ROOMS = ROOMS_DATA.slice(0, 3);

// Habitaciones por tipo
export const ROOMS_BY_TYPE = {
  'individual': ROOMS_DATA.filter(r => r.roomType === 'individual'),
  'doble': ROOMS_DATA.filter(r => r.roomType === 'doble'),
  'triple': ROOMS_DATA.filter(r => r.roomType === 'triple'),
  'cuadruple': ROOMS_DATA.filter(r => r.roomType === 'cuadruple'),
  'suite': ROOMS_DATA.filter(r => r.roomType === 'suite'),
  'familiar': ROOMS_DATA.filter(r => r.roomType === 'familiar')
};

// Estadísticas del establecimiento
export const ESTABLISHMENT_STATS = {
  totalRooms: ROOMS_DATA.length,
  averagePrice: Math.round(ROOMS_DATA.reduce((sum, r) => sum + r.pricing.basePrice, 0) / ROOMS_DATA.length),
  averageRating: Math.round((ROOMS_DATA.reduce((sum, r) => sum + r.stats.rating, 0) / ROOMS_DATA.length) * 10) / 10,
  totalReviews: ROOMS_DATA.reduce((sum, r) => sum + r.stats.reviewCount, 0),
  totalCapacity: ROOMS_DATA.reduce((sum, r) => sum + r.maxGuests, 0),
  averageOccupancy: Math.round((ROOMS_DATA.reduce((sum, r) => sum + (r.stats.occupancyRate || 0), 0) / ROOMS_DATA.length)),
  
  byRoomType: {
    individual: ROOMS_BY_TYPE.individual.length,
    doble: ROOMS_BY_TYPE.doble.length,
    triple: ROOMS_BY_TYPE.triple.length,
    cuadruple: ROOMS_BY_TYPE.cuadruple.length,
    suite: ROOMS_BY_TYPE.suite.length,
    familiar: ROOMS_BY_TYPE.familiar.length
  },
  
  priceRange: {
    min: Math.min(...ROOMS_DATA.map(r => r.pricing.basePrice)),
    max: Math.max(...ROOMS_DATA.map(r => r.pricing.basePrice))
  }
};

// ================================
// 🔄 FUNCIONES DE UTILIDAD
// ================================

export function getRoomById(id: string): Room | undefined {
  return ROOMS_DATA.find(room => room.id === id);
}

export function getRoomsByType(type: RoomType): Room[] {
  return ROOMS_DATA.filter(room => room.roomType === type);
}

export function getRoomsByCapacity(minGuests: number): Room[] {
  return ROOMS_DATA.filter(room => room.maxGuests >= minGuests);
}

export function getRoomsByPriceRange(min: number, max: number): Room[] {
  return ROOMS_DATA.filter(room => 
    room.pricing.basePrice >= min && room.pricing.basePrice <= max
  );
}

export function getAvailableRooms(): Room[] {
  return ROOMS_DATA.filter(room => 
    room.availability.isActive && room.availability.isAvailable
  );
}