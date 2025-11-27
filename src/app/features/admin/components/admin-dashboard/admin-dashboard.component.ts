import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-dashboard',
  template: `
    <div class="p-6 space-y-8">
      <div class="space-y-2">
        <p class="text-sm uppercase tracking-widest text-indigo-500 font-semibold">Admin</p>
        <h1 class="text-3xl font-bold text-slate-900">Tổng quan hoạt động</h1>
        <p class="text-slate-500">Theo dõi nhanh hiệu suất theo thành viên và xu hướng cuộc họp theo ngày.</p>
      </div>

      <section class="space-y-6">
        <header>
          <h2 class="text-xl font-semibold text-slate-800">Thành viên nổi bật</h2>
          <p class="text-sm text-slate-500">So sánh số cuộc họp giữa các thành viên trong tổ chức.</p>
        </header>
        <app-member-meeting-stats-chart></app-member-meeting-stats-chart>
      </section>

    </div>
  `
})
export class AdminDashboardComponent { }
