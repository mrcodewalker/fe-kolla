import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss']
})
export class DataTableComponent<T> {
  @ViewChild('dt') table!: Table;

  @Input() data: T[] = [];
  @Input() columns: any[] = [];
  @Input() loading: boolean = false;
  @Input() paginator: boolean = true;
  @Input() paginatorPosition: 'top' | 'bottom' | 'both' = 'top';
  @Input() lazy: boolean = true;
  @Input() rows: number = 10;
  @Input() totalRecords: number = 0;
  @Input() rowsPerPageOptions: number[] = [5, 10, 25, 50];
  @Input() pageLinkSize: number = 5;
  @Input() showCurrentPageReport: boolean = true;
  @Input() currentPageReportTemplate: string = 'Hiển thị {first} đến {last} trong tổng số {totalRecords} bản ghi';
  @Input() paginatorDropdownAppendTo: 'body' | 'self' | null = 'body';
  @Input() globalFilterFields: string[] = [];

  @Output() onPage = new EventEmitter<any>();
  @Output() onSort = new EventEmitter<any>();
  @Output() onFilter = new EventEmitter<any>();
  @Output() onRowSelect = new EventEmitter<any>();
  @Output() onRowUnselect = new EventEmitter<any>();

  first: number = 0;
  selectedItems: T[] = [];

  clear(table: Table) {
    table.clear();
    this.selectedItems = [];
  }

  onPageChange(event: any) {
    this.first = event.first;
    this.onPage.emit(event);
  }

  onSortChange(event: any) {
    this.onSort.emit(event);
  }

  onFilterChange(event: any) {
    this.onFilter.emit(event);
  }

  onRowSelection(event: any) {
    this.onRowSelect.emit(event);
  }

  onRowUnselection(event: any) {
    this.onRowUnselect.emit(event);
  }

  onGlobalFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.table.filterGlobal(filterValue, 'contains');
  }

  // Removed rows per page functionality - fixed at 10 rows
}
