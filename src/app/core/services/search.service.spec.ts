// 📁 src/app/core/services/search.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { SearchService } from './search.service';
import { PropertyService } from './property.service';
import { SearchParams, Filters } from '../models/search.interface';
import { MOCK_PROPERTIES, DEFAULT_FILTERS } from '../data/mock-properties';

describe('SearchService', () => {
  let service: SearchService;
  let propertyService: PropertyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SearchService);
    propertyService = TestBed.inject(PropertyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should update search parameters', () => {
    const params: SearchParams = {
      destination: 'Salento',
      checkIn: '2024-01-15',
      checkOut: '2024-01-18',
      guests: 2
    };

    service.updateSearchParams(params);

    service.searchParams$.subscribe(currentParams => {
      expect(currentParams.destination).toBe('Salento');
      expect(currentParams.guests).toBe(2);
    });
  });

  it('should search properties with destination filter', (done) => {
    const params: SearchParams = {
      destination: 'Salento',
      checkIn: '',
      checkOut: '',
      guests: 1
    };

    service.searchProperties(params).subscribe(properties => {
      expect(properties).toBeDefined();
      properties.forEach(property => {
        expect(
          property.location.toLowerCase().includes('salento') ||
          property.shortLocation.toLowerCase().includes('salento')
        ).toBeTruthy();
      });
      done();
    });
  });

  it('should sort properties by price ascending', () => {
    const properties = [...MOCK_PROPERTIES];
    const sorted = service.sortProperties(properties, 'price-asc');

    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].pricePerNight).toBeGreaterThanOrEqual(sorted[i-1].pricePerNight);
    }
  });

  it('should sort properties by price descending', () => {
    const properties = [...MOCK_PROPERTIES];
    const sorted = service.sortProperties(properties, 'price-desc');

    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].pricePerNight).toBeLessThanOrEqual(sorted[i-1].pricePerNight);
    }
  });

  it('should sort properties by rating', () => {
    const properties = [...MOCK_PROPERTIES];
    const sorted = service.sortProperties(properties, 'rating');

    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].rating).toBeLessThanOrEqual(sorted[i-1].rating);
    }
  });

  it('should sort properties by reviews count', () => {
    const properties = [...MOCK_PROPERTIES];
    const sorted = service.sortProperties(properties, 'reviews');

    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].reviewsCount).toBeLessThanOrEqual(sorted[i-1].reviewsCount);
    }
  });

  it('should apply property type filters', (done) => {
    const filters: Filters = {
      ...DEFAULT_FILTERS,
      propertyTypes: {
        finca: true,
        cabana: false,
        hacienda: false,
        glamping: false
      }
    };

    const testProperties = MOCK_PROPERTIES;

    service.applyFilters(testProperties, filters).subscribe(filtered => {
      expect(filtered).toBeDefined();
      filtered.forEach(property => {
        expect(property.propertyType).toBe('finca');
      });
      done();
    });
  });

  it('should apply experience filters', (done) => {
    const filters: Filters = {
      ...DEFAULT_FILTERS,
      experiences: {
        coffeTour: true,
        hiking: false,
        birdwatching: false,
        thermalSprings: false
      }
    };

    const testProperties = MOCK_PROPERTIES;

    service.applyFilters(testProperties, filters).subscribe(filtered => {
      expect(filtered).toBeDefined();
      filtered.forEach(property => {
        expect(property.experiences).toContain('coffeTour');
      });
      done();
    });
  });

  it('should apply price range filters', (done) => {
    const filters: Filters = {
      ...DEFAULT_FILTERS,
      priceMin: 80000,
      priceMax: 120000
    };

    const testProperties = MOCK_PROPERTIES;

    service.applyFilters(testProperties, filters).subscribe(filtered => {
      expect(filtered).toBeDefined();
      filtered.forEach(property => {
        expect(property.pricePerNight).toBeGreaterThanOrEqual(80000);
        expect(property.pricePerNight).toBeLessThanOrEqual(120000);
      });
      done();
    });
  });

  it('should apply minimum rating filter', (done) => {
    const filters: Filters = {
      ...DEFAULT_FILTERS,
      minRating: 4.5
    };

    const testProperties = MOCK_PROPERTIES;

    service.applyFilters(testProperties, filters).subscribe(filtered => {
      expect(filtered).toBeDefined();
      filtered.forEach(property => {
        expect(property.rating).toBeGreaterThanOrEqual(4.5);
      });
      done();
    });
  });

  it('should clear all filters', () => {
    // Primero aplicamos algunos filtros
    const customFilters: Filters = {
      ...DEFAULT_FILTERS,
      propertyTypes: { finca: true, cabana: false, hacienda: false, glamping: false },
      minRating: 4.5
    };

    service.updateFilters(customFilters);
    
    // Luego los limpiamos
    service.clearFilters();

    service.filters$.subscribe(filters => {
      expect(filters).toEqual(DEFAULT_FILTERS);
    });
  });

  it('should update view mode', () => {
    service.setViewMode('map');

    service.config$.subscribe(config => {
      expect(config.viewMode).toBe('map');
    });
  });

  it('should update sort criteria', () => {
    service.setSortBy('price-asc');

    service.config$.subscribe(config => {
      expect(config.sortBy).toBe('price-asc');
    });
  });

  it('should update current page', () => {
    service.setCurrentPage(3);

    service.config$.subscribe(config => {
      expect(config.currentPage).toBe(3);
    });
  });

  it('should validate search dates correctly', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    const checkIn = tomorrow.toISOString().split('T')[0];
    const checkOut = dayAfter.toISOString().split('T')[0];

    const validation = service.validateSearchDates(checkIn, checkOut);
    expect(validation.valid).toBeTruthy();
  });

  it('should invalidate past dates', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const today = new Date();

    const checkIn = yesterday.toISOString().split('T')[0];
    const checkOut = today.toISOString().split('T')[0];

    const validation = service.validateSearchDates(checkIn, checkOut);
    expect(validation.valid).toBeFalsy();
    expect(validation.error).toContain('pasado');
  });

  it('should invalidate checkout before checkin', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const today = new Date();

    const checkIn = tomorrow.toISOString().split('T')[0];
    const checkOut = today.toISOString().split('T')[0];

    const validation = service.validateSearchDates(checkIn, checkOut);
    expect(validation.valid).toBeFalsy();
    expect(validation.error).toContain('posterior');
  });

  it('should calculate nights correctly', () => {
    const checkIn = '2024-01-15';
    const checkOut = '2024-01-18';

    const nights = service.calculateNights(checkIn, checkOut);
    expect(nights).toBe(3);
  });

  it('should return destination suggestions', () => {
    const suggestions = service.getDestinationSuggestions();
    expect(suggestions).toBeDefined();
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions).toContain('Salento');
    expect(suggestions).toContain('Armenia');
  });

  it('should get filter state with active filters detection', (done) => {
    const filtersWithActivity: Filters = {
      ...DEFAULT_FILTERS,
      propertyTypes: { finca: true, cabana: false, hacienda: false, glamping: false }
    };

    service.updateFilters(filtersWithActivity);

    service.getFilterState().subscribe(state => {
      expect(state.hasActiveFilters).toBeTruthy();
      expect(state.activeFilters.propertyTypes.finca).toBeTruthy();
      done();
    });
  });
});