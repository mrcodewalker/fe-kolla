import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { MemberMeetingStatsChartComponent } from './member-meeting-stats-chart.component';

@NgModule({
  declarations: [MemberMeetingStatsChartComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CalendarModule,
    NgxChartsModule
  ],
  exports: [MemberMeetingStatsChartComponent]
})
export class MemberMeetingStatsChartModule { }
