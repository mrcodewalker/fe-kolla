import { Component } from '@angular/core';

@Component({
  selector: 'app-secretary-dashboard',
  template: `
    <div class="p-6 space-y-8">
      <div class="space-y-2">
        <p class="text-sm uppercase tracking-widest text-emerald-500 font-semibold">Secretary</p>
        <h1 class="text-3xl font-bold text-slate-900">Theo dõi cuộc họp</h1>
        <p class="text-slate-500">Kiểm soát chi tiết hiệu suất thành viên và diễn biến cuộc họp theo từng ngày.</p>
      </div>

      <section class="space-y-6">
        <header>
          <h2 class="text-xl font-semibold text-slate-800">Hiệu suất theo thành viên</h2>
          <p class="text-sm text-slate-500">Phân tích số cuộc họp, tìm kiếm nhanh theo tên hoặc email.</p>
        </header>
        <app-member-meeting-stats-chart></app-member-meeting-stats-chart>
      </section>

    </div>
  `
})
export class SecretaryDashboardComponent { }
