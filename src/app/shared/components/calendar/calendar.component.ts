import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

type CalendarCell = {
  day: number | null;
  hasTx: boolean;
};

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  standalone: false
})
export class CalendarComponent implements OnChanges {
  @Input() year = new Date().getFullYear();
  @Input() month = new Date().getMonth(); // 0-11
  @Input() daysWithTx: number[] = [];
  @Input() selectedDay: number | null = null;

  @Output() selectedDayChange = new EventEmitter<number | null>();

  cells: CalendarCell[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['year'] || changes['month'] || changes['daysWithTx']) {
      this.rebuildCalendar();
    }
  }

  selectDay(day: number) {
    const next = this.selectedDay === day ? null : day;
    this.selectedDay = next;
    this.selectedDayChange.emit(next);
  }

  private rebuildCalendar() {
    const first = new Date(this.year, this.month, 1);
    const firstDow = first.getDay(); // 0=Dom
    const daysInMonth = new Date(this.year, this.month + 1, 0).getDate();

    const days = new Set<number>();
    for (const d of this.daysWithTx ?? []) {
      const n = Number(d);
      if (Number.isFinite(n) && n >= 1 && n <= 31) {
        days.add(n);
      }
    }

    const cells: CalendarCell[] = [];

    for (let i = 0; i < firstDow; i++) {
      cells.push({ day: null, hasTx: false });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ day, hasTx: days.has(day) });
    }

    // Completa la grilla a semanas completas
    while (cells.length % 7 !== 0) {
      cells.push({ day: null, hasTx: false });
    }

    this.cells = cells;
  }
}
