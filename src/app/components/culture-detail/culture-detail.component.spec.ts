import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CultureDetailComponent } from './culture-detail.component';
import { MatDialog } from '@angular/material/dialog';
import { CultureService } from '../../services/culture.service';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';

class MockCultureService {
  private selectedNodeId = signal<string | null>(null);
  private cultures = signal<any[]>([]);

  getSelectedNodeIdSignal() {
    return this.selectedNodeId.asReadonly();
  }

  getCulturesSignal() {
    return this.cultures.asReadonly();
  }

  getAncestors() {
    return [];
  }
  getDescendants() {
    return [];
  }
}

const matDialogMock = {
  open: () => ({ afterClosed: () => of(null) }),
};

describe('CultureDetailComponent', () => {
  let component: CultureDetailComponent;
  let fixture: ComponentFixture<CultureDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CultureDetailComponent],
      providers: [
        { provide: MatDialog, useValue: matDialogMock },
        { provide: CultureService, useClass: MockCultureService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CultureDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
