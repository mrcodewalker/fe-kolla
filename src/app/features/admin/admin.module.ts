import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { MemberMeetingStatsChartModule } from '../../common/components/member-meeting-stats-chart/member-meeting-stats-chart.module';
import { DailyMeetingStatsModule } from '../../common/components/daily-meeting-stats/daily-meeting-stats.module';

const routes: Routes = [
  {
    path: '',
    component: AdminDashboardComponent
  }
];

@NgModule({
  declarations: [
    AdminDashboardComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MemberMeetingStatsChartModule,
    DailyMeetingStatsModule
  ]
})
export class AdminModule { }
