import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CultureDetailComponent } from './culture-detail.component';
import { MatDialog } from '@angular/material/dialog';
import { CultureService } from '../../services/culture.service';
import { of } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

class MockCultureService {
  getSelectedNodeId() {
    return of(null);
  }
  getCultures() {
    return of([]);
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
