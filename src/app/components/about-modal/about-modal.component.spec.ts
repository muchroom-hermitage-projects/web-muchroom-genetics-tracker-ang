import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AboutModalComponent } from './about-modal.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('AboutModalComponent', () => {
  let component: AboutModalComponent;
  let fixture: ComponentFixture<AboutModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutModalComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose the JSON data format example', () => {
    const example = component.dataFormatExample;
    expect(example).toContain('"version": 1');
    expect(example).toContain('"cultures": [Culture]');
    expect(example).toContain('"relationships": [Relationship]');
    expect(example).toContain('"filters": {');
  });
});
