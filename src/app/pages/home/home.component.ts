import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  
  featuredProperties = [
    {
      id: 1,
      title: 'Cozy Downtown Hostel',
      location: 'City Center',
      price: 25,
      rating: 4.5,
      image: 'https://via.placeholder.com/300x200'
    },
    {
      id: 2,
      title: 'Modern Apartment',
      location: 'Residential Area',
      price: 75,
      rating: 4.8,
      image: 'https://via.placeholder.com/300x200'
    },
    {
      id: 3,
      title: 'Beach View Hostel',
      location: 'Coastal Zone',
      price: 35,
      rating: 4.6,
      image: 'https://via.placeholder.com/300x200'
    }
  ];

}