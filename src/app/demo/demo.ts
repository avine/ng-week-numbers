import { DatePipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { DcWeekNumberHeader } from 'week-numbers';

@Component({
  imports: [DatePipe, MatCardModule, MatFormFieldModule, MatInputModule, MatDatepickerModule],
  selector: 'app-demo',
  styleUrl: './demo.scss',
  templateUrl: './demo.html',
})
export class Demo {
  readonly weekNumberHeader = DcWeekNumberHeader;
  selectedDate = signal<Date | null>(null);
}
