import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { MeetingService } from '../../services/meeting.service';
import { LegendPosition, Color, ScaleType } from '@swimlane/ngx-charts';

export type ChartType = 'bar' | 'line' | 'pie';

interface DailyStat {
  date: string;
  meetingCount: number;
  participantCount: number;
}

interface DailyStatsResponse {
  startDate: string;
  endDate: string;
  totalMeetings: number;
  totalParticipants: number;
  dailyStats: DailyStat[];
}

interface ChartDataItem {
  name: string;
  value: number;
}

interface LineChartSeries {
  name: string;
  series: { name: string; value: number }[];
}

@Component({
  selector: 'app-daily-meeting-stats',
  templateUrl: './daily-meeting-stats.component.html',
  styleUrls: ['./daily-meeting-stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DailyMeetingStatsComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  dailyStats: DailyStat[] = [];
  totalMeetings = 0;
  totalParticipants = 0;
  lastUpdated?: Date;

  // Chart configuration
  chartType: ChartType = 'line';
  meetingChartData: ChartDataItem[] = [];
  participantChartData: ChartDataItem[] = [];
  lineChartData: LineChartSeries[] = [];

  // Quick date presets
  datePresets = [
    { label: '7 ngày', days: 7 },
    { label: '14 ngày', days: 14 },
    { label: '30 ngày', days: 30 },
    { label: '90 ngày', days: 90 }
  ];
  selectedPreset: number | null = 7;

  // Chart dimensions
  view: [number, number] = [900, 400];

  // Chart options
  showXAxis = true;
  showYAxis = true;
  gradient = false;
  showLegend = true;
  showXAxisLabel = true;
  showYAxisLabel = true;
  xAxisLabel = 'Ngày';
  yAxisLabel = 'Số lượng';
  legendPosition: LegendPosition = LegendPosition.Below;

  // Line chart options
  yScaleMin = 0;
  yScaleMax = 10;
  roundDomains = true;
  showGridLines = true;

  // Pie chart options
  showLabels = true;
  isDoughnut = true;
  arcWidth = 0.35;

  // Color schemes
  colorScheme: Color = {
    name: 'custom',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: [
      '#6366F1', // Indigo - Meetings
      '#10B981', // Emerald - Participants
      '#F59E0B', // Amber
      '#EC4899', // Pink
      '#8B5CF6', // Violet
      '#06B6D4', // Cyan
      '#3B82F6', // Blue
      '#EF4444', // Red
    ]
  };

  chartTypes: { type: ChartType; label: string; icon: string }[] = [
    { type: 'line', label: 'Biểu đồ đường', icon: 'pi pi-chart-line' },
    { type: 'bar', label: 'Biểu đồ cột', icon: 'pi pi-chart-bar' },
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
    start.setDate(end.getDate() - 7);
    return { start, end };
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.selectedPreset = null;
    this.loadStats();
  }

  resetRange(): void {
    const { start, end } = this.getDefaultRange();
    this.form.patchValue({ startDate: start, endDate: end });
    this.selectedPreset = 7;
    this.loadStats();
  }

  selectPreset(days: number): void {
    this.selectedPreset = days;
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
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

    const params: { startDate?: string; endDate?: string; days?: number } = {};

    if (typeof this.selectedPreset === 'number') {
      params.days = this.selectedPreset;
    } else {
      params.startDate = start;
      params.endDate = end;
    }

    this.loading = true;
    this.meetingService.getDailyMeetingStats(params)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response) => {
          const data: DailyStatsResponse = response?.data ?? {
            dailyStats: [],
            totalMeetings: 0,
            totalParticipants: 0
          };
          this.dailyStats = data.dailyStats || [];
          this.totalMeetings = data.totalMeetings || 0;
          this.totalParticipants = data.totalParticipants || 0;
          this.lastUpdated = new Date();
          this.updateChartData();
          this.cdr.markForCheck();
        },
        error: () => {
          this.dailyStats = [];
          this.totalMeetings = 0;
          this.totalParticipants = 0;
          this.meetingChartData = [];
          this.participantChartData = [];
          this.lineChartData = [];
          this.cdr.markForCheck();
        }
      });
  }

  private updateChartData(): void {
    // Format dates for display (dd/MM/yyyy from API, show as dd/MM)
    const formatDisplayDate = (dateStr: string): string => {
      // API returns yyyy-MM-dd, convert to dd/MM
      if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        return `${parts[2]}/${parts[1]}`;
      }
      // If already dd/MM/yyyy format
      const parts = dateStr.split('/');
      return `${parts[0]}/${parts[1]}`;
    };

    // For bar chart - meetings
    this.meetingChartData = this.dailyStats.map(stat => ({
      name: formatDisplayDate(stat.date),
      value: stat.meetingCount
    }));

    // For bar chart - participants
    this.participantChartData = this.dailyStats.map(stat => ({
      name: formatDisplayDate(stat.date),
      value: stat.participantCount
    }));

    // For line chart - both series
    this.lineChartData = [
      {
        name: 'Cuộc họp',
        series: this.dailyStats.map(stat => ({
          name: formatDisplayDate(stat.date),
          value: stat.meetingCount
        }))
      },
      {
        name: 'Người tham gia',
        series: this.dailyStats.map(stat => ({
          name: formatDisplayDate(stat.date),
          value: stat.participantCount
        }))
      }
    ];

    // Calculate yScaleMax
    const maxMeeting = Math.max(...this.dailyStats.map(s => s.meetingCount), 1);
    const maxParticipant = Math.max(...this.dailyStats.map(s => s.participantCount), 1);
    this.yScaleMax = Math.ceil(Math.max(maxMeeting, maxParticipant) * 1.2);

    // Adjust view based on data count
    if (this.chartType === 'line' || this.chartType === 'bar') {
      const width = Math.max(800, this.dailyStats.length * 60);
      this.view = [Math.min(width, 1200), 400];
    } else {
      this.view = [800, 450];
    }
  }

  onSelect(event: any): void {
    console.log('Selected:', event);
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

  formatDisplayDate(dateStr: string): string {
    // API returns yyyy-MM-dd, convert to dd/MM/yyyy
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }
}

