import { Meeting } from '../../models/meeting.model';
import { Component, OnInit } from '@angular/core';
import { MeetingService } from '../../services/meeting.service';
import { RoomDataService } from '../../services/room-data.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
})
export class CalendarComponent implements OnInit {
  joinMeeting(link: string | undefined | null) {
    if (!link) {
      return;
    }
    
    const token = this.authService.getAuthToken();
    if (!token) {
      console.error('Không tìm thấy token xác thực');
      return;
    }
    
    // Navigate to meeting URL with params
    const meetingUrl = `https://36.50.54.109:8081?meetLink=${encodeURIComponent(link)}&token=${encodeURIComponent(token)}`;
    window.open(meetingUrl, '_blank');
  }
  showEventModal: boolean = false;
  selectedEvent: Meeting | null = null;
  selectedDay: Date | null = null;
  events: Meeting[] = [];

  getEventsForDay(date: Date) {
    const dateKey = this.getDateKey(date);
    return this.events.filter(
      (e) => e.startTime && e.startTime.slice(0, 10) === dateKey
    );
  }

  private getDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  onEventClick(event: Meeting) {
    // Call getById from meetingService and store result in selectedEvent
    if (event && event.id) {
      this.meetingService.getById(event.id).subscribe({
        next: (res: any) => {
          this.selectedEvent = res.data;
          this.showEventModal = true;
        },
        error: (err) => {
          console.error('Lỗi lấy chi tiết cuộc họp:', err);
          // Fallback: show modal with basic event info
          this.selectedEvent = event;
          this.showEventModal = true;
        }
      });
    } else {
      this.selectedEvent = event;
      this.showEventModal = true;
    }
  }

  closeEventModal() {
    this.showEventModal = false;
    this.selectedEvent = null;
  }

  monthNames = [
    'Tháng 1',
    'Tháng 2',
    'Tháng 3',
    'Tháng 4',
    'Tháng 5',
    'Tháng 6',
    'Tháng 7',
    'Tháng 8',
    'Tháng 9',
    'Tháng 10',
    'Tháng 11',
    'Tháng 12',
  ];
  weekDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  currentMonth: number = new Date().getMonth();
  currentYear: number = new Date().getFullYear();
  calendarDays: Array<{
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
  }> = [];

  constructor(
    private meetingService: MeetingService,
    private roomDataService: RoomDataService,
    private authService: AuthService
  ) {
    this.generateCalendar();
  }
  ngOnInit(): void {
    this.getEvent();
  }

  generateCalendar() {
    this.calendarDays = [];
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    // Days from previous month
    for (let i = 0; i < startDayOfWeek; i++) {
      const prevDate = new Date(this.currentYear, this.currentMonth, -i);
      this.calendarDays.unshift({
        date: prevDate,
        isCurrentMonth: false,
        isToday: false,
      });
    }
    // Days in current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(this.currentYear, this.currentMonth, d);
      const today = new Date();
      this.calendarDays.push({
        date,
        isCurrentMonth: true,
        isToday:
          date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear(),
      });
    }
    // Fill next month days to complete week
    const endDayOfWeek = lastDay.getDay();
    for (let i = 1; i < 7 - endDayOfWeek; i++) {
      const nextDate = new Date(this.currentYear, this.currentMonth + 1, i);
      this.calendarDays.push({
        date: nextDate,
        isCurrentMonth: false,
        isToday: false,
      });
    }
  }

  prevMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.generateCalendar();
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.generateCalendar();
  }

  selectDay(day: { date: Date }) {
    this.selectedDay = day.date;
  }

  getEvent() {
    this.roomDataService
      .getRoomSchedule({ month: this.currentMonth + 1, year: this.currentYear })
      .subscribe((res: any) => {
        this.events = res.data || [];
      });
  }
}
