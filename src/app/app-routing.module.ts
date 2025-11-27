import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './common/components/login/login.component';
import { AuthGuard } from './common/guards/auth.guard';
import { NoAuthGuard } from './common/guards/no-auth.guard';
import { HomeComponent } from './common/components/home/home.component';
import { RoomListComponent } from './common/components/room-list/room-list.component';
import { RoomDetailComponent } from './common/components/room-detail/room-detail.component';
import { CalendarComponent } from './common/components/calendar/calendar.component';
import { UserInfoComponent } from './common/components/user-info/user-info.component';
import { MembershipRequirementComponent } from './common/components/membership-requirement/membership-requirement.component';
import { ApproveComponent } from './common/components/approve/approve.component';
import { NotificationComponent } from './common/components/notification/notification.component';
import { MeetingHistoryComponent } from './common/components/meeting-history/meeting-history.component';
import { DocumentsComponent } from './common/components/documents/documents.component';
import { DepartmentsComponent } from './common/components/departments/departments.component';
import { ManagementComponent } from './common/components/management/management.component';
import { SuperviseComponent } from './common/components/supervise/supervise.component';
import { JoinHistoryComponent } from './common/components/join-history/join-history.component';
import { JoinHistoryManagementComponent } from './common/components/join-history-management/join-history-management.component';
import { ChangePasswordComponent } from './common/components/change-password/change-password.component';
import { EditLogManagementComponent } from './common/components/edit-log-management/edit-log-management.component';
import { DailyMeetingStatsComponent } from './common/components/daily-meeting-stats/daily-meeting-stats.component';


const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [NoAuthGuard]
  },
  {
    path: 'calendar',
    component: CalendarComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'membership-requirement',
    component: MembershipRequirementComponent,
    canActivate: [AuthGuard]
  },

  // Admin routes
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.module').then(m => m.AdminModule),
    canActivate: [AuthGuard],
    data: { role: 'ADMIN' }
  },
  // Secretary routes
  {
    path: 'secretary',
    loadChildren: () => import('./features/secretary/secretary.module').then(m => m.SecretaryModule),
    canActivate: [AuthGuard],
    data: { role: 'SECRETARY' }
  },
  // User routes
  {
    path: 'user',
    loadChildren: () => import('./features/user/user.module').then(m => m.UserModule),
    canActivate: [AuthGuard],
    data: { role: 'USER' }
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  // Home route
  {
  path: 'home',
  component: HomeComponent,
  canActivate: [AuthGuard],
  children: [
    { path: '', redirectTo: 'roomlist', pathMatch: 'full' },
    { path: 'roomlist', component: RoomListComponent, canActivate: [AuthGuard] },
    { path: 'roomdetail/:id', component: RoomDetailComponent, canActivate: [AuthGuard] },
    { path: 'calendar', component: CalendarComponent, canActivate: [AuthGuard] },
    { path: 'userinfo', component: UserInfoComponent, canActivate: [AuthGuard] },
    { path: 'change-password', component: ChangePasswordComponent, canActivate: [AuthGuard] },
    { path: 'approve', component: ApproveComponent, canActivate: [AuthGuard] },
    { path: 'notification', component: NotificationComponent, canActivate: [AuthGuard] },
    { path: 'meeting-history', component: MeetingHistoryComponent, canActivate: [AuthGuard] },
    { path: 'documents', component: DocumentsComponent, canActivate: [AuthGuard] },
    { path: 'departments', component: DepartmentsComponent, canActivate: [AuthGuard] },
    { path: 'management', component: ManagementComponent, canActivate: [AuthGuard] },
    { path: 'supervise', component: SuperviseComponent, canActivate: [AuthGuard] },
    { path: 'join-history', component: JoinHistoryComponent, canActivate: [AuthGuard] },
    { path: 'join-history-management', component: JoinHistoryManagementComponent, canActivate: [AuthGuard] },
    { path: 'edit-log-management', component: EditLogManagementComponent, canActivate: [AuthGuard] },
    {
      path: 'admin-analytics',
      loadChildren: () => import('./features/admin/admin.module').then(m => m.AdminModule),
      canActivate: [AuthGuard],
      data: { role: 'ADMIN' }
    },
    {
      path: 'secretary-analytics',
      loadChildren: () => import('./features/secretary/secretary.module').then(m => m.SecretaryModule),
      canActivate: [AuthGuard],
      data: { role: 'SECRETARY' }
    },
    {
      path: 'daily-meeting-stats',
      component: DailyMeetingStatsComponent,
      canActivate: [AuthGuard],
      data: { roles: ['ADMIN', 'SECRETARY'] }
    }
  ]
},
  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
