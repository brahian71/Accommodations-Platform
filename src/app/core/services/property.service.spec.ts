// 📁 src/app/core/services/property.service.spec.ts

import { TestBed } from '@angular/core/testing';
import { PropertyService } from './property.service';
import { MOCK_PROPERTIES } from '../data/mock-properties';

describe('PropertyService', () => {
  let service: PropertyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PropertyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return all properties', (done) => {
    service.getProperties().subscribe(properties => {
      expect(properties).toBeDefined();
      expect(properties.length).toBe(MOCK_PROPERTIES.length);
      expect(properties[0]).toHaveProperty('id');
      expect(properties[0]).toHaveProperty('title');
      expect(properties[0]).toHaveProperty('pricePerNight');
      done();
    });
  });

  it('should return featured properties', (done) => {
    service.getFeaturedProperties().subscribe(properties => {
      expect(properties).toBeDefined();
      expect(properties.length).toBeLessThanOrEqual(3);
      done();
    });
  });

  it('should find property by id', (done) => {
    const testId = '1';
    service.getPropertyById(testId).subscribe(property => {
      expect(property).toBeDefined();
      expect(property?.id).toBe(testId);
      done();
    });
  });

  it('should return undefined for non-existent property id', (done) => {
    service.getPropertyById('999').subscribe(property => {
      expect(property).toBeUndefined();
      done();
    });
  });

  it('should filter properties by type', (done) => {
    service.getPropertiesByType('finca').subscribe(properties => {
      expect(properties).toBeDefined();
      properties.forEach(property => {
        expect(property.propertyType).toBe('finca');
      });
      done();
    });
  });

  it('should filter properties by location', (done) => {
    service.getPropertiesByLocation('Salento').subscribe(properties => {
      expect(properties).toBeDefined();
      properties.forEach(property => {
        expect(property.location.toLowerCase()).toContain('salento');
      });
      done();
    });
  });

  it('should toggle favorite status', (done) => {
    const propertyId = '1';
    
    service.toggleFavorite(propertyId).subscribe(isFavorite => {
      expect(typeof isFavorite).toBe('boolean');
      
      service.isFavorite(propertyId).subscribe(favoriteStatus => {
        expect(favoriteStatus).toBe(isFavorite);
        done();
      });
    });
  });

  it('should search properties by text', (done) => {
    const searchTerm = 'cafetera';
    
    service.searchProperties(searchTerm).subscribe(properties => {
      expect(properties).toBeDefined();
      properties.forEach(property => {
        const matchesSearch = 
          property.title.toLowerCase().includes(searchTerm) ||
          property.description.toLowerCase().includes(searchTerm) ||
          property.includedExperiences.some(exp => exp.toLowerCase().includes(searchTerm));
        expect(matchesSearch).toBeTruthy();
      });
      done();
    });
  });

  it('should return all properties for empty search', (done) => {
    service.searchProperties('').subscribe(properties => {
      expect(properties.length).toBe(MOCK_PROPERTIES.length);
      done();
    });
  });

  it('should filter by price range', (done) => {
    const minPrice = 80000;
    const maxPrice = 120000;
    
    service.getPropertiesByPriceRange(minPrice, maxPrice).subscribe(properties => {
      properties.forEach(property => {
        expect(property.pricePerNight).toBeGreaterThanOrEqual(minPrice);
        expect(property.pricePerNight).toBeLessThanOrEqual(maxPrice);
      });
      done();
    });
  });

  it('should filter by minimum rating', (done) => {
    const minRating = 4.5;
    
    service.getPropertiesByMinRating(minRating).subscribe(properties => {
      properties.forEach(property => {
        expect(property.rating).toBeGreaterThanOrEqual(minRating);
      });
      done();
    });
  });

  it('should get property statistics', (done) => {
    service.getPropertyStats().subscribe(stats => {
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byType');
      expect(stats).toHaveProperty('averagePrice');
      expect(stats).toHaveProperty('averageRating');
      expect(stats.total).toBe(MOCK_PROPERTIES.length);
      done();
    });
  });
});