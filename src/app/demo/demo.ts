import { Component } from '@angular/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DcWeekNumbers } from 'week-numbers';

@Component({
  imports: [MatFormFieldModule, MatInputModule, MatDatepickerModule, DcWeekNumbers],
  selector: 'app-demo',
  styleUrl: './demo.scss',
  templateUrl: './demo.html',
})
export class Demo {}
