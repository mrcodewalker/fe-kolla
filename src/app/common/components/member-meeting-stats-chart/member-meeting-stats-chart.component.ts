import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, ViewChild, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { MeetingService } from '../../services/meeting.service';
import { Meeting } from '../../models/meeting.model';
import { LegendPosition, Color, ScaleType } from '@swimlane/ngx-charts';

export type ChartType = 'bar' | 'line' | 'pie';

interface MemberMeetingStat {
  userId: number;
  name: string;
  email: string;
  meetingCount: number;
}

interface ChartDataItem {
  name: string;
  value: number;
  extra?: { email: string; userId: number };
}

interface LineChartSeries {
  name: string;
  series: { name: string; value: number }[];
}

@Component({
  selector: 'app-member-meeting-stats-chart',
  templateUrl: './member-meeting-stats-chart.component.html',
  styleUrls: ['./member-meeting-stats-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MemberMeetingStatsChartComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  stats: MemberMeetingStat[] = [];
  filteredStats: MemberMeetingStat[] = [];
  searchTerm = '';
  maxMeetingCount = 0;
  lastUpdated?: Date;

  // Dialog properties
  dialogVisible = false;
  selectedMember: MemberMeetingStat | null = null;
  memberMeetings: Meeting[] = [];
  loadingMeetings = false;

  // Pagination properties
  currentPage = 1;
  pageSize = 20;
  totalMeetings = 0;
  today = new Date();
  
  // Drag properties
  @ViewChild('dialogPanel') dialogPanel!: ElementRef;
  isDragging = false;
  dragOffset = { x: 0, y: 0 };
  dialogPosition = { x: 0, y: 0 };

  // Chart configuration
  chartType: ChartType = 'bar';
  chartData: ChartDataItem[] = [];
  lineChartData: LineChartSeries[] = [];

  // Chart dimensions
  view: [number, number] = [800, 450];

  // Chart options
  showXAxis = true;
  showYAxis = true;
  gradient = false; // Solid colors - no white mix
  showLegend = false;
  showXAxisLabel = true;
  showYAxisLabel = true;
  xAxisLabel = 'Thành viên';
  yAxisLabel = 'Số cuộc họp';
  legendPosition: LegendPosition = LegendPosition.Below;

  // Line chart options
  yScaleMin = 0;
  yScaleMax = 10;
  roundDomains = true;
  showGridLines = true;

  // Pie chart options
  showLabels = true;
  isDoughnut = true;
  explodeSlices = false;
  arcWidth = 0.35;

  // Color scheme - Modern gradient palette
  colorScheme: Color = {
    name: 'custom',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: [
      '#6366F1', // Indigo
      '#8B5CF6', // Violet
      '#EC4899', // Pink
      '#F59E0B', // Amber
      '#10B981', // Emerald
      '#06B6D4', // Cyan
      '#3B82F6', // Blue
      '#EF4444', // Red
      '#84CC16', // Lime
      '#F97316', // Orange
    ]
  };

  chartTypes: { type: ChartType; label: string; icon: string }[] = [
    { type: 'bar', label: 'Biểu đồ cột', icon: 'pi pi-chart-bar' },
    { type: 'line', label: 'Biểu đồ đường', icon: 'pi pi-chart-line' },
    { type: 'pie', label: 'Biểu đồ tròn', icon: 'pi pi-chart-pie' }
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly meetingService: MeetingService,
    private readonly cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.buildForm();
    this.loadStats();
  }

  private buildForm(): void {
    const { start, end } = this.getDefaultRange();
    this.form = this.fb.group({
      startDate: [start, Validators.required],
      endDate: [end, Validators.required]
    });
  }

  private getDefaultRange(): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return { start, end };
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loadStats();
  }

  resetRange(): void {
    const { start, end } = this.getDefaultRange();
    this.form.patchValue({ startDate: start, endDate: end });
    this.loadStats();
  }

  setChartType(type: ChartType): void {
    this.chartType = type;
    this.updateChartData();
  }

  private loadStats(): void {
    const { startDate, endDate } = this.form.value;
    const start = this.toApiDate(startDate);
    const end = this.toApiDate(endDate);

    this.loading = true;
    this.meetingService.getMemberMeetingStats({ startDate: start, endDate: end })
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response) => {
          const data = response?.data ?? [];
          this.stats = data;
          this.lastUpdated = new Date();
          this.searchTerm = '';
          this.applyFilter();
        },
        error: () => {
          this.stats = [];
          this.filteredStats = [];
          this.chartData = [];
          this.lineChartData = [];
          this.maxMeetingCount = 0;
          this.cdr.markForCheck();
        }
      });
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.applyFilter();
  }

  private applyFilter(): void {
    const normalizedTerm = this.searchTerm.trim().toLowerCase();
    this.filteredStats = normalizedTerm
      ? this.stats.filter(member =>
          (member.name || '').toLowerCase().includes(normalizedTerm) ||
          (member.email || '').toLowerCase().includes(normalizedTerm)
        )
      : [...this.stats];

    this.maxMeetingCount = this.filteredStats.reduce((max, member) => Math.max(max, member.meetingCount), 0);
    this.updateChartData();
    this.cdr.markForCheck();
  }

  private updateChartData(): void {
    // For bar and pie charts
    this.chartData = this.filteredStats.map(member => ({
      name: member.name || member.email,
      value: member.meetingCount,
      extra: { email: member.email, userId: member.userId }
    }));

    // For line chart - use index as x-axis for better visualization
    this.lineChartData = [{
      name: 'Số cuộc họp',
      series: this.filteredStats.map((member, index) => ({
        name: member.name || member.email,
        value: member.meetingCount
      }))
    }];

    // Calculate yScaleMax for proper line chart scaling
    const maxVal = Math.max(...this.filteredStats.map(m => m.meetingCount), 1);
    this.yScaleMax = Math.ceil(maxVal * 1.2); // Add 20% padding

    // Adjust view based on data count for bar chart
    if (this.chartType === 'bar') {
      const height = Math.max(400, this.filteredStats.length * 55);
      this.view = [800, Math.min(height, 1200)];
    } else if (this.chartType === 'line') {
      const width = Math.max(800, this.filteredStats.length * 120);
      this.view = [Math.min(width, 1400), 450];
    } else {
      this.view = [800, 500];
    }
  }

  formatTooltip(item: ChartDataItem): string {
    return `${item.name}: ${item.value} cuộc họp`;
  }

  formatPieLabel(item: { name: string; value: number }): string {
    return `${item.name} (${item.value})`;
  }

  onSelect(event: any): void {
    // Find the member from the chart event
    const memberName = event.name || event;
    const member = this.filteredStats.find(m => 
      (m.name || m.email) === memberName || m.email === event?.extra?.email
    );
    
    if (member) {
      this.openMemberMeetingsDialog(member);
    }
  }

  openMemberMeetingsDialog(member: MemberMeetingStat): void {
    this.selectedMember = member;
    this.dialogVisible = true;
    this.currentPage = 1;
    this.dialogPosition = { x: 0, y: 0 };
    this.loadMemberMeetings(member.userId);
  }

  closeMemberMeetingsDialog(): void {
    this.dialogVisible = false;
    this.selectedMember = null;
    this.memberMeetings = [];
    this.currentPage = 1;
    this.totalMeetings = 0;
  }

  private loadMemberMeetings(userId: number): void {
    const { startDate } = this.form.value;
    const start = this.toApiDate(startDate);
    const today = this.toApiDate(new Date());

    this.loadingMeetings = true;
    this.memberMeetings = [];
    this.cdr.markForCheck();

    this.meetingService.searchMeeting({
      createdBy: userId,
      startDate: start,
        endDate: today,
      page: this.currentPage - 1,
      size: this.pageSize,
      sortBy: 'startTime',
      sortDirection: 'desc'
    })
      .pipe(finalize(() => {
        this.loadingMeetings = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (response) => {
          this.memberMeetings = response?.data?.content ?? response?.data ?? [];
          this.totalMeetings = response?.data?.totalElements ?? this.memberMeetings.length;
          this.cdr.markForCheck();
        },
        error: () => {
          this.memberMeetings = [];
          this.totalMeetings = 0;
          this.cdr.markForCheck();
        }
      });
  }

  // Pagination methods
  get totalPages(): number {
    return Math.ceil(this.totalMeetings / this.pageSize);
  }

  get paginationPages(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    const current = this.currentPage;
    
    let start = Math.max(1, current - 2);
    let end = Math.min(total, current + 2);
    
    if (end - start < 4) {
      if (start === 1) {
        end = Math.min(total, start + 4);
      } else {
        start = Math.max(1, end - 4);
      }
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      if (this.selectedMember) {
        this.loadMemberMeetings(this.selectedMember.userId);
      }
    }
  }

  prevPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  // Drag methods
  onDragStart(event: MouseEvent): void {
    this.isDragging = true;
    this.dragOffset = {
      x: event.clientX - this.dialogPosition.x,
      y: event.clientY - this.dialogPosition.y
    };
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onDragMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    
    this.dialogPosition = {
      x: event.clientX - this.dragOffset.x,
      y: event.clientY - this.dragOffset.y
    };
    this.cdr.markForCheck();
  }

  @HostListener('document:mouseup')
  onDragEnd(): void {
    this.isDragging = false;
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeMemberMeetingsDialog();
    }
  }

  formatMeetingDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const year = date.getFullYear();
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  private toApiDate(value: Date | null): string | undefined {
    if (!value) {
      return undefined;
    }

    const date = new Date(value);
    const day = `${date.getDate()}`.padStart(2, '0');
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }
}
