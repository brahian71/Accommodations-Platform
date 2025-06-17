// 📁 src/app/core/models/calendar.interface.ts

// ================================
// 📅 TIPOS BASE PARA FECHAS
// ================================

export type DateString = string;
export type TimeString = string;
export type DateTimeString = string;

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type MonthNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

// ================================
// 📆 DISPONIBILIDAD DIARIA
// ================================

export interface DayAvailability {
  date: DateString;
  dayOfWeek: DayOfWeek;
  dayNumber: number;
  
  isAvailable: boolean;
  isBlocked: boolean;
  isBooked: boolean;
  isPastDate: boolean;
  isToday: boolean;
  
  minimumStay?: number;
  maximumStay?: number;

  priceOverride?: number;
  hasSpecialPrice: boolean;

  blockReason?: string;
  bookingId?: string;
  checkInAllowed: boolean;
  checkOutAllowed: boolean;

  notes?: string;
  isHoliday?: boolean;
  holidayName?: string;
}

// ================================
// 🗓️ CALENDARIO MENSUAL
// ================================
export interface CalendarMonth {
  year: number;
  month: MonthNumber;
  monthName: string;
  monthNameShort: string;

  days: DayAvailability[];
  totalDays: number;

  previousMonthDays: DayAvailability[];
  nextMonthDays: DayAvailability[];

  availableDays: number;
  bookedDays: number;
  blockedDays: number;

  isCurrentMonth: boolean;
  isPastMonth: boolean;
  isFutureMonth: boolean;
}

// ================================
// 📋 CONFIGURACIÓN DEL CALENDARIO
// ================================

export interface CalendarConfig {
  startWeekOnMonday: boolean;
  showPreviousMonth: boolean;
  showNextMonth: boolean;
  highlightToday: boolean;

  minDate?: DateString;
  maxDate?: DateString;
  disabledDates: DateString[];

  allowSameDayBooking: boolean;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  
  globalMinimumStay: number;
  globalMaximumStay: number;

  checkInDaysAllowed: DayOfWeek[];
  checkOutDaysAllowed: DayOfWeek[];
  
  // Precios y descuentos
  showPricesOnCalendar: boolean;
  weeklyDiscountDays: number;      // A partir de cuántas noches aplica descuento semanal
  monthlyDiscountDays: number;     // A partir de cuántas noches aplica descuento mensual
}

// ================================
// 🎯 SELECCIÓN DE FECHAS
// ================================

export interface DateSelection {
  checkIn: DateString | null;
  checkOut: DateString | null;

  nights: number;
  totalDays: number;

  isValid: boolean;
  errors: string[];
  warnings: string[];

  weekendNights: number;
  weekdayNights: number;
  hasHolidays: boolean;
  
  estimatedTotal?: number;
  applicableDiscounts: string[];
}

// ================================
// 🚫 REGLAS DE DISPONIBILIDAD
// ================================

export interface AvailabilityRule {
  id: string;
  name: string;
  propertyId: string;
  
  // Tipo de regla
  ruleType: 'block' | 'minimum-stay' | 'maximum-stay' | 'pricing' | 'check-in-out';
  
  // Aplicación de la regla
  startDate: DateString;
  endDate: DateString;
  daysOfWeek?: DayOfWeek[];
  
  // Configuración según tipo
  blockReason?: string;
  minimumStay?: number;
  maximumStay?: number;
  priceMultiplier?: number;    // Factor de precio (1.0 = normal, 1.5 = +50%)
  allowCheckIn?: boolean;
  allowCheckOut?: boolean;
  
  // Metadata
  isActive: boolean;
  priority: number;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
  
  // Descripción para el anfitrión
  description?: string;
  isRecurring: boolean;
}

// ================================
// 🇨🇴 DÍAS FESTIVOS COLOMBIA
// ================================

export interface Holiday {
  date: DateString;
  name: string;
  type: 'national' | 'regional' | 'religious';
  isFixedDate: boolean;
  description?: string;
}

// ================================
// 📊 ESTADÍSTICAS DE CALENDARIO
// ================================

export interface CalendarStats {
  propertyId: string;
  
  // Período analizado
  startDate: DateString;
  endDate: DateString;
  totalDays: number;
  
  // Disponibilidad
  availableDays: number;
  bookedDays: number;
  blockedDays: number;
  
  // Ocupación
  occupancyRate: number;       // Porcentaje de ocupación
  averageStayLength: number;   // Promedio de noches por reserva
  
  // Ingresos
  totalRevenue: number;
  averageDailyRate: number;    // Tarifa promedio por noche
  revenuePar: number;          // Revenue Per Available Room
  
  // Tendencias
  peakSeason: {
    startDate: DateString;
    endDate: DateString;
    occupancyRate: number;
  }[];
  
  lowSeason: {
    startDate: DateString;
    endDate: DateString;
    occupancyRate: number;
  }[];

  popularCheckInDays: DayOfWeek[];
  popularCheckOutDays: DayOfWeek[];
}

// ================================
// 🔧 UTILIDADES Y HELPERS
// ================================

export interface DateRange {
  startDate: DateString;
  endDate: DateString;
  nights: number;
  isValid: boolean;
}

export interface CalendarNavigation {
  currentMonth: number;
  currentYear: number;
  canGoToPrevious: boolean;
  canGoToNext: boolean;
  availableMonths: { year: number; month: number; label: string }[];
}

export interface PriceCalendarDay extends DayAvailability {
  displayPrice: number;
  originalPrice: number;
  discountPercentage?: number;
  priceTooltip: string;
}

// ================================
// 🎨 CONFIGURACIÓN VISUAL
// ================================

export interface CalendarTheme {

  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;

  availableColor: string;
  blockedColor: string;
  bookedColor: string;
  selectedColor: string;
  hoverColor: string;

  textColor: string;
  mutedTextColor: string;
  headerTextColor: string;

  borderColor: string;
  borderRadius: string;
  cellPadding: string;
}

// ================================
// 🎯 CONSTANTES DEL CALENDARIO
// ================================

export const CALENDAR_CONSTANTS = {
  DEFAULT_CONFIG: {
    startWeekOnMonday: true,
    showPreviousMonth: true,
    showNextMonth: true,
    highlightToday: true,
    allowSameDayBooking: false,
    minAdvanceHours: 2,
    maxAdvanceDays: 365,
    globalMinimumStay: 1,
    globalMaximumStay: 90,
    checkInDaysAllowed: [0, 1, 2, 3, 4, 5, 6],
    checkOutDaysAllowed: [0, 1, 2, 3, 4, 5, 6],
    showPricesOnCalendar: true,
    weeklyDiscountDays: 7,
    monthlyDiscountDays: 28,
    disabledDates: []
  } as CalendarConfig,
  
  MONTH_NAMES: [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ],
  
  MONTH_NAMES_SHORT: [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ],
  
  DAY_NAMES: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  DAY_NAMES_SHORT: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  DAY_NAMES_MINIMAL: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
  
  COLOMBIA_HOLIDAYS_2025: [
    { date: '2025-01-01', name: 'Año Nuevo', type: 'national' },
    { date: '2025-01-06', name: 'Día de los Reyes Magos', type: 'religious' },
    { date: '2025-03-24', name: 'Día de San José', type: 'religious' },
    { date: '2025-04-13', name: 'Domingo de Ramos', type: 'religious' },
    { date: '2025-04-17', name: 'Jueves Santo', type: 'religious' },
    { date: '2025-04-18', name: 'Viernes Santo', type: 'religious' },
    { date: '2025-05-01', name: 'Día del Trabajo', type: 'national' },
    { date: '2025-06-02', name: 'Ascensión del Señor', type: 'religious' },
    { date: '2025-06-23', name: 'Corpus Christi', type: 'religious' },
    { date: '2025-06-30', name: 'Sagrado Corazón de Jesús', type: 'religious' },
    { date: '2025-07-20', name: 'Día de la Independencia', type: 'national' },
    { date: '2025-08-07', name: 'Batalla de Boyacá', type: 'national' },
    { date: '2025-08-18', name: 'Asunción de la Virgen', type: 'religious' },
    { date: '2025-10-13', name: 'Día de la Raza', type: 'national' },
    { date: '2025-11-03', name: 'Todos los Santos', type: 'religious' },
    { date: '2025-11-17', name: 'Independencia de Cartagena', type: 'national' },
    { date: '2025-12-08', name: 'Inmaculada Concepción', type: 'religious' },
    { date: '2025-12-25', name: 'Navidad', type: 'religious' }
  ] as Holiday[]
};

// ================================
// 🔄 TIPOS DERIVADOS
// ================================

export type CalendarMode = 'selection' | 'availability' | 'pricing' | 'blocked';
export type CalendarView = 'month' | 'year';

export interface BookingDatePicker {
  mode: 'check-in' | 'check-out' | 'range';
  selectedDates: DateSelection;
  availabilityData: DayAvailability[];
  config: CalendarConfig;
  onDateSelect: (date: DateString, mode: 'check-in' | 'check-out') => void;
  onRangeSelect: (checkIn: DateString, checkOut: DateString) => void;
}

// ================================
// ✅ VALIDACIONES DE FECHAS
// ================================

export interface DateValidationResult {
  isValid: boolean;
  errors: {
    code: string;
    message: string;
    field: 'checkIn' | 'checkOut' | 'range';
  }[];
  warnings: {
    code: string;
    message: string;
  }[];
}