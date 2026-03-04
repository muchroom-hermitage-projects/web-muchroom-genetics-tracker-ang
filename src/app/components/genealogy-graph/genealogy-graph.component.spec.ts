import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GenealogyGraphComponent } from './genealogy-graph.component';
import { CultureService } from '../../services/culture.service';
import { GraphBuilderService } from '../../services/graph-builder.service';
import { of } from 'rxjs';

// Mock services
class MockCultureService {
  getCultures() { return of([]); }
  getRelationships() { return of([]); }
  getSelectedNodeId() { return of(null); }
  setSelectedNode(id: string | null) {}
}

class MockGraphBuilderService {
  buildElements(cultures: any[], relationships: any[]) { return []; }
  getStylesheet() { return []; }
}

describe('GenealogyGraphComponent', () => {
  let component: GenealogyGraphComponent;
  let fixture: ComponentFixture<GenealogyGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GenealogyGraphComponent ],
      providers: [
        { provide: CultureService, useClass: MockCultureService },
        { provide: GraphBuilderService, useClass: MockGraphBuilderService }
      ]
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
