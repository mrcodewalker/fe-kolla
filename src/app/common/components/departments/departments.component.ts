import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DepartmentService, DepartmentItem, DepartmentSearchParams, CreateDepartmentRequest, UpdateDepartmentRequest } from '../../services/department.service';

interface ColumnConfig {
  field: keyof DepartmentItem | 'actions';
  header: string;
  filterType?: string;
  type?: string;
  format?: string;
  currency?: string;
  visible: boolean;
  defaultVisible: boolean;
  alwaysVisible?: boolean;
}

@Component({
  selector: 'app-departments',
  templateUrl: './departments.component.html',
  styleUrls: ['./departments.component.scss']
})
export class DepartmentsComponent implements OnInit {
  form: FormGroup;
  addDepartmentForm: FormGroup;
  editDepartmentForm: FormGroup;

  loading = false;
  rows: DepartmentItem[] = [];
  filteredRows: DepartmentItem[] = [];
  totalRecords = 0;
  page = 0; // 0-based
  size = 10;
  sortBy = 'id';
  sortDirection: 'asc' | 'desc' = 'asc';

  showColumnSelector = false;
  componentInitialized = false;

  // Autocomplete for department name
  departmentSuggestions: DepartmentItem[] = [];
  private departmentFilterTimeout: any;
  selectedDepartmentId: number | null = null;

  // Add Department Dialog
  showAddDialog = false;
  addingDepartment = false;

  // Edit Department Dialog
  showEditDialog = false;
  editingDepartment = false;
  editingDepartmentId: number | null = null;
  initialEditFormValues: { name: string; description: string } | null = null;

  // Confirm Dialog
  showConfirmDialog = false;
  confirmDialogTitle = 'Xác nhận';
  confirmDialogMessage = 'Bạn có chắc chắn muốn thực hiện thao tác này?';
  confirmDialogType: 'delete' | 'default' = 'delete';
  pendingDeleteDepartment: DepartmentItem | null = null;

  columnConfig: ColumnConfig[] = [
    { 
      field: 'id', 
      header: 'ID', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true, 
      alwaysVisible: true 
    },
    { 
      field: 'departmentCode', 
      header: 'Mã phòng ban', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true 
    },
    { 
      field: 'departmentName', 
      header: 'Tên phòng ban', 
      filterType: 'text', 
      visible: true, 
      defaultVisible: true 
    },
    { 
      field: 'actions', 
      header: 'Thao tác', 
      filterType: 'none', 
      visible: true, 
      defaultVisible: true, 
      alwaysVisible: true 
    }
  ];

  constructor(
    private fb: FormBuilder,
    private departmentService: DepartmentService
  ) {
    this.form = this.fb.group({
      name: [null]
    });

    this.addDepartmentForm = this.fb.group({
      name: ['', [Validators.required]],
      description: ['']
    });

    this.editDepartmentForm = this.fb.group({
      name: ['', [Validators.required]],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.loadData();
    // Mark component as initialized after a small delay
    setTimeout(() => {
      this.componentInitialized = true;
    }, 100);
  }

  // Called when dropdown is shown - load initial 10 departments
  onDepartmentDropdownShow(): void {
    // Only load if suggestions are empty
    if (this.departmentSuggestions.length === 0) {
      this.loadInitialDepartments();
    }
  }

  // Load initial 10 departments
  private loadInitialDepartments(): void {
    this.departmentService.searchDepartments({ size: 10 }).subscribe({
      next: (res) => {
        if (res && res.success && res.data && Array.isArray(res.data)) {
          this.departmentSuggestions = res.data.slice(0, 10);
        } else {
          this.departmentSuggestions = [];
        }
      },
      error: () => {
        this.departmentSuggestions = [];
      }
    });
  }

  // Called when user types in the filter box
  onDepartmentFilter(event: any): void {
    const name = event.filter?.trim();
    
    // Clear previous timeout
    if (this.departmentFilterTimeout) {
      clearTimeout(this.departmentFilterTimeout);
    }

    // If empty, load initial departments
    if (!name) {
      this.loadInitialDepartments();
      return;
    }

    // Debounce search with 1 second delay
    this.departmentFilterTimeout = setTimeout(() => {
      this.departmentService.searchDepartments({ name: name, size: 10 }).subscribe({
        next: (res) => {
          if (res && res.success && res.data && Array.isArray(res.data)) {
            this.departmentSuggestions = res.data;
          } else {
            this.departmentSuggestions = [];
          }
        },
        error: () => {
          this.departmentSuggestions = [];
        }
      });
    }, 1000);
  }

  // Called when a department is selected
  onDepartmentSelect(event: any): void {
    if (event.value) {
      this.selectedDepartmentId = event.value.id || null;
      console.log('Selected department:', event.value.departmentName, 'with id:', this.selectedDepartmentId);
    } else {
      // Cleared
      this.selectedDepartmentId = null;
    }
  }

  get displayedColumns(): ColumnConfig[] {
    return this.columnConfig.filter(col => col.visible);
  }

  get globalFilterFields(): string[] {
    return this.displayedColumns.map(col => col.field as string);
  }

  getSortableField(col: ColumnConfig): string | undefined {
    return col.field !== 'actions' ? col.field as string : undefined;
  }

  toggleColumnVisibility(column: ColumnConfig): void {
    if (column.alwaysVisible) {
      return;
    }
    column.visible = !column.visible;
    // Ensure at least one column is visible
    if (!this.displayedColumns.length) {
      column.visible = true;
    }
  }

  showAllColumns(): void {
    this.columnConfig.forEach(col => {
      col.visible = true;
    });
  }

  hideAllColumns(): void {
    this.columnConfig.forEach(col => {
      col.visible = col.alwaysVisible ? true : false;
    });
  }

  resetColumnVisibility(): void {
    this.columnConfig.forEach(col => {
      col.visible = col.defaultVisible || col.alwaysVisible || false;
    });
  }

  onSearch(): void {
    this.loading = true; // Show loading state
    this.page = 0; // reset to first page on search
    this.loadData();
  }

  onClear(): void {
    this.form.reset({
      name: null
    });
    this.selectedDepartmentId = null;
    this.departmentSuggestions = [];
    this.page = 0;
    this.loadData();
  }

  onPageChange(event: any): void {
    this.size = event.rows;
    this.page = Math.floor(event.first / event.rows);
    this.applyPagination();
  }

  onSortChange(event: any): void {
    if (event && event.field) {
      this.sortBy = event.field;
      this.sortDirection = event.order === 1 ? 'asc' as const : 'desc' as const;
      this.applySorting();
    }
  }

  private loadData(): void {
    this.loading = true;
    const { name } = this.form.value;
    
    // Extract department name from object if it's a DepartmentItem, otherwise use as string
    const departmentName = name && typeof name === 'object' ? name.departmentName : (name || '');
    
    // If no search term, load all departments
    if (!departmentName || departmentName.trim() === '') {
      console.log('Loading all departments...');
      this.departmentService.getAllDepartments().subscribe({
        next: (res) => {
          console.log('All Departments Response:', res);
          if (res.success && res.data) {
            this.rows = res.data;
            this.applySortingAndPagination();
          } else {
            this.rows = [];
            this.filteredRows = [];
            this.totalRecords = 0;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading all departments:', error);
          this.rows = [];
          this.filteredRows = [];
          this.totalRecords = 0;
          this.loading = false;
        }
      });
    } else {
      // Search with name parameter
      const searchParams: DepartmentSearchParams = {
        name: departmentName.trim(),
        sortBy: this.sortBy,
        sortDirection: this.sortDirection
      };

      console.log('Search Params:', searchParams);

      this.departmentService.searchDepartments(searchParams).subscribe({
        next: (res) => {
          console.log('Search Response:', res);
          if (res.success && res.data) {
            this.rows = res.data;
            this.applySortingAndPagination();
          } else {
            this.rows = [];
            this.filteredRows = [];
            this.totalRecords = 0;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error searching departments:', error);
          this.rows = [];
          this.filteredRows = [];
          this.totalRecords = 0;
          this.loading = false;
        }
      });
    }
  }

  private applySortingAndPagination(): void {
    let sortedData = [...this.rows];
    
    // Apply sorting
    if (this.sortBy) {
      sortedData.sort((a, b) => {
        const aVal = a[this.sortBy as keyof DepartmentItem];
        const bVal = b[this.sortBy as keyof DepartmentItem];
        
        let comparison = 0;
        if (aVal > bVal) comparison = 1;
        if (aVal < bVal) comparison = -1;
        
        return this.sortDirection === 'desc' ? -comparison : comparison;
      });
    }
    
    // Set total records
    this.totalRecords = sortedData.length;
    
    // Apply pagination
    const startIndex = this.page * this.size;
    const endIndex = startIndex + this.size;
    this.filteredRows = sortedData.slice(startIndex, endIndex);
  }

  private applySorting(): void {
    this.applySortingAndPagination();
  }

  private applyPagination(): void {
    this.applySortingAndPagination();
  }

  // Column Settings Methods
  onColumnToggle(column: ColumnConfig): void {
    // Column visibility is already updated via ngModel binding
    // Ensure at least one visible column (excluding always visible ones)
    const visibleCount = this.columnConfig.filter(col => col.visible).length;
    if (visibleCount === 0) {
      // If no columns are visible, revert the change
      column.visible = true;
    }
  }

  toggleColumnCard(column: ColumnConfig): void {
    if (column.alwaysVisible) {
      return; // Don't allow toggling required columns
    }
    
    column.visible = !column.visible;
    this.onColumnToggle(column);
  }

  resetColumnSettings(): void {
    this.columnConfig.forEach(col => {
      col.visible = col.defaultVisible;
    });
  }

  applyColumnSettings(): void {
    // Settings are already applied via ngModel binding
    // Just close the panel
    this.showColumnSelector = false;
  }

  toggleColumnSettings(event: Event): void {
    this.showColumnSelector = !this.showColumnSelector;
  }

  // Add Department Dialog Methods
  showAddDepartmentDialog(): void {
    this.showAddDialog = true;
    this.addDepartmentForm.reset({
      name: '',
      description: ''
    });
  }

  closeAddDepartmentDialog(): void {
    this.showAddDialog = false;
    this.addDepartmentForm.reset();
  }

  onAddDepartment(): void {
    if (this.addDepartmentForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.addDepartmentForm.controls).forEach(key => {
        this.addDepartmentForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.addingDepartment = true;
    const formData = this.addDepartmentForm.value;
    
    const createRequest: CreateDepartmentRequest = {
      name: formData.name,
      description: formData.description || ''
    };
    
    this.departmentService.createDepartment(createRequest).subscribe({
      next: (response) => {
        console.log('Department created successfully:', response);
        this.addingDepartment = false;
        this.closeAddDepartmentDialog();
        // Reload data to show new department
        this.loadData();
      },
      error: (error) => {
        console.error('Error creating department:', error);
        this.addingDepartment = false;
        // You might want to show an error message to the user here
      }
    });
  }

  // Edit Department Methods
  showEditDepartmentDialog(department: DepartmentItem): void {
    this.editingDepartmentId = department.id;
    this.showEditDialog = true;
    
    // Pre-fill the form with current department data
    const initialValues = {
      name: department.departmentName,
      description: '' // We don't have description in the current interface, but setting up for future
    };
    
    this.editDepartmentForm.patchValue(initialValues);
    
    // Save initial values for comparison
    this.initialEditFormValues = { ...initialValues };
  }

  closeEditDepartmentDialog(): void {
    this.showEditDialog = false;
    this.editingDepartmentId = null;
    this.editDepartmentForm.reset();
    this.initialEditFormValues = null;
  }

  // Check if form has been modified
  hasFormChanged(): boolean {
    if (!this.initialEditFormValues) {
      return false;
    }
    
    const currentValues = this.editDepartmentForm.value;
    return (
      currentValues.name !== this.initialEditFormValues.name ||
      currentValues.description !== this.initialEditFormValues.description
    );
  }

  onEditDepartment(): void {
    if (this.editDepartmentForm.invalid || !this.editingDepartmentId) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.editDepartmentForm.controls).forEach(key => {
        this.editDepartmentForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.editingDepartment = true;
    const formData = this.editDepartmentForm.value;
    
    const updateRequest: UpdateDepartmentRequest = {
      name: formData.name,
      description: formData.description || ''
    };
    
    this.departmentService.updateDepartment(this.editingDepartmentId, updateRequest).subscribe({
      next: (response) => {
        console.log('Department updated successfully:', response);
        this.editingDepartment = false;
        this.closeEditDepartmentDialog();
        // Reload data to show updated department
        this.loadData();
      },
      error: (error) => {
        console.error('Error updating department:', error);
        this.editingDepartment = false;
        // You might want to show an error message to the user here
      }
    });
  }

  // Delete Department Method
  deleteDepartment(department: DepartmentItem): void {
    // Show confirmation dialog
    this.pendingDeleteDepartment = department;
    this.confirmDialogTitle = 'Xác nhận xóa';
    this.confirmDialogMessage = `Bạn có chắc chắn muốn xóa phòng ban "${department.departmentName}"?`;
    this.confirmDialogType = 'delete';
    this.showConfirmDialog = true;
  }

  // Confirm Dialog Handlers
  onConfirmDialogConfirmed(): void {
    if (this.pendingDeleteDepartment == null) {
      this.showConfirmDialog = false;
      return;
    }

    const department = this.pendingDeleteDepartment;
    this.loading = true;
    this.departmentService.deleteDepartment(department.id).subscribe({
      next: (response) => {
        console.log('Department deleted successfully:', response);
        // Reload data to refresh the list
        this.loadData();
        this.pendingDeleteDepartment = null;
        this.showConfirmDialog = false;
      },
      error: (error) => {
        console.error('Error deleting department:', error);
        this.loading = false;
        this.pendingDeleteDepartment = null;
        this.showConfirmDialog = false;
        // You might want to show an error message to the user here
      }
    });
  }

  onConfirmDialogCancelled(): void {
    this.showConfirmDialog = false;
    this.pendingDeleteDepartment = null;
  }
}
