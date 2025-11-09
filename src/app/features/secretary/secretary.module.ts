import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SecretaryDashboardComponent } from './components/secretary-dashboard/secretary-dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: SecretaryDashboardComponent
  }
];

@NgModule({
  declarations: [
    SecretaryDashboardComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class SecretaryModule { }
