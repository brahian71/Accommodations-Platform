// 📁 src/app/core/data/establishment-data.ts

import { Establishment, EstablishmentAmenityType, EstablishmentServiceType } from '../models/establishment.interface';

export const ESTABLISHMENT_INFO: Establishment = {
  id: 'hostal-norte-armenia',
  name: 'Hostal Norte Armenia',
  description: 'Acogedor hostal ubicado en el corazón del norte de Armenia, Quindío. Ofrecemos habitaciones cómodas y servicios de calidad para viajeros que buscan la perfecta combinación entre comodidad, ubicación estratégica y precios justos. Ideal para viajeros de negocios, turistas y visitantes que desean explorar la región cafetera.',
  tagline: 'Tu hogar en el corazón del Quindío',
  
  // Ubicación única (basado en Norte Centro que era la zona más central)
  address: 'Carrera 15 #25-30, Norte Centro, Armenia, Quindío',
  coordinates: {
    lat: 4.5339,
    lng: -75.6811
  },
  
  // Contacto principal
  contactInfo: {
    phone: '+573137065373',
    whatsapp: '+573137065373',
    email: 'reservas@hostalnortearmenia.com',
    website: 'www.hostalnortearmenia.com',
    socialMedia: {
      instagram: '@hostalnortearmenia',
      facebook: 'HostalNorteArmenia'
    }
  },
  
  // Anfitrión principal (basado en María González que tenía mejor rating)
  host: {
    name: 'María González',
    photo: 'https://images.unsplash.com/photo-1494790108755-2616b612e886?w=150&h=150&fit=crop&crop=face',
    description: 'Anfitriona experimentada con más de 8 años en hospitalidad. Conocedora de Armenia y el Quindío, siempre dispuesta a ayudar a nuestros huéspedes con recomendaciones locales.',
    responseTime: 'inmediata',
    languages: ['Español', 'Inglés básico']
  },
  
  // Servicios generales del establecimiento
  amenities: [
    'wifi-gratis',
    'parqueadero',
    'cocina-compartida',
    'sala-comun',
    'terraza',
    'lavanderia',
    'recepcion-24h',
    'vigilancia'
  ] as EstablishmentAmenityType[],
  
  services: [
    'limpieza-diaria',
    'transporte-aeropuerto',
    'informacion-turistica',
    'custodia-equipaje',
    'tour-booking'
  ] as EstablishmentServiceType[],
  
  // Políticas generales
  policies: {
    checkInTime: '15:00',
    checkOutTime: '11:00',
    cancellationPolicy: 'flexible',
    houseRules: [
      'No fumar en habitaciones',
      'Respeto por otros huéspedes',
      'No mascotas',
      'No fiestas en habitaciones',
      'Silencio después de las 10:00 PM'
    ],
    smokingAllowed: false,
    petsAllowed: false,
    partiesAllowed: false
  },
  
  // Información del área
  areaInfo: {
    neighborhood: 'Norte Centro, Armenia',
    nearbyPlaces: [
      'Centro Comercial Portal del Quindío',
      'Clínica La Sagrada Familia', 
      'Universidad del Quindío',
      'Parque Los Fundadores',
      'Centro Histórico de Armenia',
      'Terminal de Transporte'
    ],
    transportAccess: [
      'Bus urbano líneas 1, 2, 3 y 7',
      'Taxi disponible 24 horas',
      'Uber y apps de transporte',
      'A 10 minutos del centro',
      'A 15 minutos del aeropuerto El Edén'
    ],
    walkingDistances: {
      'Centro Comercial Portal del Quindío': '8 min',
      'Parque Los Fundadores': '12 min',
      'Centro de Armenia': '10 min',
      'Terminal de Transporte': '15 min',
      'Universidad del Quindío': '18 min'
    }
  },
  
  // Galería del establecimiento
  images: {
    main: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop'
    ],
    exterior: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop'
    ],
    commonAreas: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop'
    ]
  },
  
  // Estadísticas agregadas
  stats: {
    totalRooms: 5,
    totalCapacity: 12, // Suma de capacidad de todas las habitaciones
    averageRating: 4.8, // Promedio de todas las habitaciones
    totalReviews: 543, // Suma de todas las reseñas
    yearsOperating: 3
  },
  
  // Estado
  isActive: true,
  isVerified: true,
  establishmentType: 'hostal',
  
  // Metadata
  createdAt: '2022-01-15T00:00:00.000Z',
  updatedAt: '2024-06-15T00:00:00.000Z'
};