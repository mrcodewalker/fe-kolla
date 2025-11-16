import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ApiInterceptor } from './common/interceptors/api.interceptor';

// Components
import { DataTableComponent } from './common/components/data-table/data-table.component';
import { LoginComponent } from './common/components/login/login.component';
import { HomeComponent } from './common/components/home/home.component';
import { RoomListComponent } from './common/components/room-list/room-list.component';
import { RoomDetailComponent } from './common/components/room-detail/room-detail.component';
import { UserInfoComponent } from './common/components/user-info/user-info.component';
import { CalendarComponent } from './common/components/calendar/calendar.component';

// Services
import { WebSocketService } from './common/services/websocket.service';
import { MembershipRequirementComponent } from './common/components/membership-requirement/membership-requirement.component';
import { ApproveComponent } from './common/components/approve/approve.component';
import { NotificationComponent } from './common/components/notification/notification.component';
import { MeetingHistoryComponent } from './common/components/meeting-history/meeting-history.component';
import { DocumentsComponent } from './common/components/documents/documents.component';
import { DepartmentsComponent } from './common/components/departments/departments.component';
import { ManagementComponent } from './common/components/management/management.component';
import { SuperviseComponent } from './common/components/supervise/supervise.component';
import { LoadingComponent } from './common/components/loading/loading.component';
import { ConfirmDialogComponent } from './common/components/confirm-dialog/confirm-dialog.component';
import { JoinHistoryComponent } from './common/components/join-history/join-history.component';
import { JoinHistoryManagementComponent } from './common/components/join-history-management/join-history-management.component';
import { ChangePasswordComponent } from './common/components/change-password/change-password.component';
import { SafeUrlPipe } from './common/pipes/safe-url.pipe';

@NgModule({
  declarations: [
    AppComponent,
    DataTableComponent,
    LoginComponent,
    HomeComponent,
    RoomListComponent,
    RoomDetailComponent,
    UserInfoComponent,
    CalendarComponent,
    MembershipRequirementComponent,
    ApproveComponent,
    NotificationComponent,
    MeetingHistoryComponent,
    DocumentsComponent,
    DepartmentsComponent,
    ManagementComponent,
    SuperviseComponent,
    LoadingComponent,
    ConfirmDialogComponent,
    JoinHistoryComponent,
    JoinHistoryManagementComponent,
    ChangePasswordComponent,
    SafeUrlPipe
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    ConfirmDialogModule,
    ToastModule,
    DropdownModule,
    CalendarModule,
    TooltipModule,
    RippleModule,
    CheckboxModule,
    TagModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ApiInterceptor,
      multi: true
    },
    WebSocketService,
    MessageService
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent]
})
export class AppModule { }
