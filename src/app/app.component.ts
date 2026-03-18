import { Component } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { FilterPanelComponent } from './components/filter-panel/filter-panel.component';
import { GenealogyGraphComponent } from './components/genealogy-graph/genealogy-graph.component';
import { CultureDetailComponent } from './components/culture-detail/culture-detail.component';
import { NavbarComponent } from './components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    MatSidenavModule,
    FilterPanelComponent,
    GenealogyGraphComponent,
    CultureDetailComponent,
    NavbarComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {}
