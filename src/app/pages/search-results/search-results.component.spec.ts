// 📁 src/app/pages/search-results/search-results.component.spec.ts

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { SearchResultsComponent } from './search-results.component';
import { PropertyService } from '../../core/services/property.service';
import { MOCK_PROPERTIES } from '../../core/data/mock-properties';

describe('SearchResultsComponent', () => {
  let component: SearchResultsComponent;
  let fixture: ComponentFixture<SearchResultsComponent>;
  let mockPropertyService: jasmine.SpyObj<PropertyService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    const propertyServiceSpy = jasmine.createSpyObj('PropertyService', [
      'searchWithFilters',
      'toggleFavorite',
      'incrementPropertyViews',
      'calculateWeeklyDiscount'
    ]);

    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    mockActivatedRoute = {
      queryParams: of({
        zone: 'norte-centro',
        checkIn: '2024-07-01',
        checkOut: '2024-07-03',
        guests: '2'
      })
    };

    await TestBed.configureTestingModule({
      imports: [SearchResultsComponent],
      providers: [
        { provide: PropertyService, useValue: propertyServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchResultsComponent);
    component = fixture.componentInstance;
    mockPropertyService = TestBed.inject(PropertyService) as jasmine.SpyObj<PropertyService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Mock del propertiesSubject para simular datos
    (mockPropertyService as any).propertiesSubject = {
      value: MOCK_PROPERTIES
    };

    mockPropertyService.toggleFavorite.and.returnValue(of(true));
    mockPropertyService.incrementPropertyViews.and.returnValue(of(true));
    mockPropertyService.calculateWeeklyDiscount.and.returnValue(10);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load search params from route', () => {
    component.ngOnInit();

    expect(component.searchData.destination).toBe('norte-centro');
    expect(component.searchData.checkIn).toBe('2024-07-01');
    expect(component.searchData.checkOut).toBe('2024-07-03');
    expect(component.searchData.guests).toBe(2);
  });

  it('should filter properties by zone', () => {
    component.ngOnInit();
    
    // Simular selección de zona específica
    component.toggleZone('la-secreta', true);
    
    component.filteredProperties$.subscribe(properties => {
      const laSecretaProperties = properties.filter(p => p.zone === 'la-secreta');
      expect(laSecretaProperties.length).toBeGreaterThan(0);
      laSecretaProperties.forEach(property => {
        expect(property.zone).toBe('la-secreta');
      });
    });
  });

  it('should filter properties by type', () => {
    component.ngOnInit();
    
    component.togglePropertyType('habitacion', true);
    
    component.filteredProperties$.subscribe(properties => {
      const habitaciones = properties.filter(p => p.propertyType === 'habitacion');
      expect(habitaciones.length).toBeGreaterThan(0);
      habitaciones.forEach(property => {
        expect(property.propertyType).toBe('habitacion');
      });
    });
  });

  it('should filter properties by amenities', () => {
    component.ngOnInit();
    
    component.toggleAmenity('wifi', true);
    component.toggleAmenity('ac', true);
    
    component.filteredProperties$.subscribe(properties => {
      properties.forEach(property => {
        expect(property.amenities).toContain('wifi');
        expect(property.amenities).toContain('ac');
      });
    });
  });

  it('should filter properties by services', () => {
    component.ngOnInit();
    
    component.toggleService('cleaning', true);
    
    component.filteredProperties$.subscribe(properties => {
      properties.forEach(property => {
        expect(property.services).toContain('cleaning');
      });
    });
  });

  it('should filter properties by price range', () => {
    component.ngOnInit();
    
    const priceRange = { priceMin: 50000, priceMax: 100000 };
    component.onPriceFilterClick(priceRange);
    
    component.filteredProperties$.subscribe(properties => {
      properties.forEach(property => {
        expect(property.pricePerNight).toBeGreaterThanOrEqual(50000);
        expect(property.pricePerNight).toBeLessThanOrEqual(100000);
      });
    });
  });

  it('should filter properties by minimum rating', () => {
    component.ngOnInit();
    
    component.setMinRating(4.5);
    
    component.filteredProperties$.subscribe(properties => {
      properties.forEach(property => {
        expect(property.rating).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  it('should filter verified properties', () => {
    component.ngOnInit();
    
    component.toggleSpecialFilter('verified', true);
    
    component.filteredProperties$.subscribe(properties => {
      properties.forEach(property => {
        expect(property.isVerified).toBeTruthy();
      });
    });
  });

  it('should filter instant book properties', () => {
    component.ngOnInit();
    
    component.toggleSpecialFilter('instantBook', true);
    
    component.filteredProperties$.subscribe(properties => {
      properties.forEach(property => {
        expect(property.isInstantBook).toBeTruthy();
      });
    });
  });

  it('should sort properties by price ascending', () => {
    component.ngOnInit();
    
    component.updateSortBy('price-asc');
    
    component.filteredProperties$.subscribe(properties => {
      for (let i = 1; i < properties.length; i++) {
        expect(properties[i].pricePerNight).toBeGreaterThanOrEqual(properties[i - 1].pricePerNight);
      }
    });
  });

  it('should sort properties by price descending', () => {
    component.ngOnInit();
    
    component.updateSortBy('price-desc');
    
    component.filteredProperties$.subscribe(properties => {
      for (let i = 1; i < properties.length; i++) {
        expect(properties[i].pricePerNight).toBeLessThanOrEqual(properties[i - 1].pricePerNight);
      }
    });
  });

  it('should sort properties by rating', () => {
    component.ngOnInit();
    
    component.updateSortBy('rating');
    
    component.filteredProperties$.subscribe(properties => {
      for (let i = 1; i < properties.length; i++) {
        expect(properties[i].rating).toBeLessThanOrEqual(properties[i - 1].rating);
      }
    });
  });

  it('should handle pagination correctly', () => {
    component.ngOnInit();
    
    component.updateItemsPerPage(2);
    
    component.getPaginatedProperties().subscribe(paginatedProperties => {
      expect(paginatedProperties.length).toBeLessThanOrEqual(2);
    });
  });

  it('should navigate to property details', () => {
    const propertyId = 'test-property-id';
    
    component.viewProperty(propertyId);
    
    expect(mockPropertyService.incrementPropertyViews).toHaveBeenCalledWith(propertyId);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/property', propertyId]);
  });

  it('should toggle favorite status', () => {
    const propertyId = 'test-property-id';
    
    component.toggleFavorite(propertyId);
    
    expect(mockPropertyService.toggleFavorite).toHaveBeenCalledWith(propertyId);
  });

  it('should navigate to booking on quick book', () => {
    const propertyId = 'test-property-id';
    component.searchData = {
      destination: 'norte-centro',
      checkIn: '2024-07-01',
      checkOut: '2024-07-03',
      guests: 2
    };
    
    component.quickBook(propertyId);
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/booking', propertyId], {
      queryParams: {
        checkIn: '2024-07-01',
        checkOut: '2024-07-03',
        guests: 2
      }
    });
  });

  it('should open WhatsApp contact', () => {
    const mockProperty = {
      ...MOCK_PROPERTIES[0],
      hostWhatsapp: '+573001234567'
    };
    
    spyOn(window, 'open');
    
    component.contactHost(mockProperty);
    
    expect(window.open).toHaveBeenCalled();
    const callArgs = (window.open as jasmine.Spy).calls.mostRecent().args;
    expect(callArgs[0]).toContain('wa.me');
    expect(callArgs[0]).toContain(mockProperty.hostWhatsapp);
  });

  it('should clear all filters', () => {
    // Establecer algunos filtros
    component.toggleZone('norte-centro', true);
    component.togglePropertyType('habitacion', true);
    component.setMinRating(4.0);
    
    // Limpiar filtros
    component.clearFilters();
    
    expect(component.hasActiveFiltersSync()).toBeFalsy();
    expect(component.currentMinRating).toBe(0);
  });

  it('should validate search data correctly', () => {
    // Fechas válidas
    component.searchData = {
      destination: 'norte-centro',
      checkIn: '2024-07-01',
      checkOut: '2024-07-03',
      guests: 2
    };
    
    expect(component['validateSearchData']()).toBeTruthy();
    
    // Fechas inválidas
    component.searchData.checkOut = '2024-06-30';
    
    expect(component['validateSearchData']()).toBeFalsy();
    expect(component.searchError).toBeTruthy();
  });

  it('should count active filters correctly', () => {
    component.toggleZone('norte-centro', true);
    component.togglePropertyType('habitacion', true);
    component.toggleAmenity('wifi', true);
    component.setMinRating(4.5);
    
    expect(component.getActiveFiltersCount()).toBe(4);
  });

  it('should get correct zone names', () => {
    expect(component.getZoneName('norte-centro')).toBe('Norte Centro');
    expect(component.getZoneName('la-secreta')).toBe('La Secreta');
    expect(component.getZoneName('bosques-pinares')).toBe('Bosques de Pinares');
  });

  it('should get correct property type labels', () => {
    expect(component.getPropertyTypeLabel('habitacion')).toBe('Habitación Privada');
    expect(component.getPropertyTypeLabel('apartamento')).toBe('Apartamento Completo');
    expect(component.getPropertyTypeLabel('studio')).toBe('Studio');
  });

  it('should get correct amenity labels', () => {
    expect(component.getAmenityLabel('wifi')).toBe('WiFi gratis');
    expect(component.getAmenityLabel('ac')).toBe('Aire acondicionado');
    expect(component.getAmenityLabel('parking')).toBe('Parqueadero');
  });

  it('should get correct service labels', () => {
    expect(component.getServiceLabel('cleaning')).toBe('Servicio de limpieza');
    expect(component.getServiceLabel('transport')).toBe('Transporte al aeropuerto');
    expect(component.getServiceLabel('late-checkin')).toBe('Check-in tardío');
  });

  it('should calculate weekly discount correctly', () => {
    const property = MOCK_PROPERTIES[0];
    
    const discount = component.getWeeklyDiscount(property);
    
    expect(mockPropertyService.calculateWeeklyDiscount).toHaveBeenCalledWith(property);
    expect(discount).toBe(10);
  });

  it('should handle business friendly filter', () => {
    component.toggleSpecialFilter('businessFriendly', true);
    
    component.filteredProperties$.subscribe(properties => {
      properties.forEach(property => {
        expect(property.amenities).toContain('wifi');
        expect(property.amenities).toContain('ac');
        expect(['norte-centro', 'villa-liliana']).toContain(property.zone);
      });
    });
  });

  it('should reset search correctly', () => {
    // Establecer datos de búsqueda y filtros
    component.searchData = {
      destination: 'norte-centro',
      checkIn: '2024-07-01',
      checkOut: '2024-07-03',
      guests: 4
    };
    component.toggleZone('la-secreta', true);
    
    // Reset
    component.resetSearch();
    
    expect(component.searchData.destination).toBe('');
    expect(component.searchData.guests).toBe(2);
    expect(component.hasActiveFiltersSync()).toBeFalsy();
  });

  it('should change view mode correctly', () => {
    component.setViewMode('map');
    
    component.config$.subscribe(config => {
      expect(config.viewMode).toBe('map');
    });
    
    component.setViewMode('list');
    
    component.config$.subscribe(config => {
      expect(config.viewMode).toBe('list');
    });
  });
});