import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSidenavModule } from '@angular/material/sidenav';
import { AppComponent } from './app.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  template: '<div data-testid="navbar-stub"></div>',
})
class NavbarStubComponent {}

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  template: '',
})
class FilterPanelStubComponent {}

@Component({
  selector: 'app-genealogy-graph',
  standalone: true,
  template: '',
})
class GenealogyGraphStubComponent {}

@Component({
  selector: 'app-culture-detail',
  standalone: true,
  template: '',
})
class CultureDetailStubComponent {}

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    TestBed.overrideComponent(AppComponent, {
      set: {
        imports: [
          MatSidenavModule,
          NavbarStubComponent,
          FilterPanelStubComponent,
          GenealogyGraphStubComponent,
          CultureDetailStubComponent,
        ],
      },
    });

    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  });

  it('creates the app shell', () => {
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('renders the navbar and main layout containers', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('app-navbar')).toBeTruthy();
    expect(compiled.querySelector('mat-sidenav-container')).toBeTruthy();
    expect(compiled.querySelector('app-culture-detail')).toBeTruthy();
  });
});
