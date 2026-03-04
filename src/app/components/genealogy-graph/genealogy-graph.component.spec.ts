import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenealogyGraphComponent } from './genealogy-graph.component';

describe('GenealogyGraphComponent', () => {
  let component: GenealogyGraphComponent;
  let fixture: ComponentFixture<GenealogyGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GenealogyGraphComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GenealogyGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
