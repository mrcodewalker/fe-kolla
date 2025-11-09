import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeetingHistoryComponent } from './meeting-history.component';

describe('MeetingHistoryComponent', () => {
  let component: MeetingHistoryComponent;
  let fixture: ComponentFixture<MeetingHistoryComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MeetingHistoryComponent]
    });
    fixture = TestBed.createComponent(MeetingHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
