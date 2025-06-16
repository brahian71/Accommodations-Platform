// 📁 src/app/pages/property-details/property-details.module.ts

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PropertyDetailsRoutingModule } from './property-details-routing.module';
import { PropertyDetailsComponent } from './property-details.component';

@NgModule({
  declarations: [
    PropertyDetailsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    PropertyDetailsRoutingModule
  ]
})
export class PropertyDetailsModule { }