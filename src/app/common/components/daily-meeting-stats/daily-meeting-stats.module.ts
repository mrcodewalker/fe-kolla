import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { DailyMeetingStatsComponent } from './daily-meeting-stats.component';

@NgModule({
  declarations: [DailyMeetingStatsComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CalendarModule,
    NgxChartsModule
  ],
  exports: [DailyMeetingStatsComponent]
})
export class DailyMeetingStatsModule { }

