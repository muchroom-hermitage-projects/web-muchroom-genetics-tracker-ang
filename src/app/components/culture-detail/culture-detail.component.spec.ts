import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CultureDetailComponent } from './culture-detail.component';

describe('CultureDetailComponent', () => {
  let component: CultureDetailComponent;
  let fixture: ComponentFixture<CultureDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CultureDetailComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CultureDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
