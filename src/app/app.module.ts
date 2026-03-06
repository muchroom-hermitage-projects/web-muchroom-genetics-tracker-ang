// app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';

import { AppComponent } from './app.component';
import { GenealogyGraphComponent } from './components/genealogy-graph/genealogy-graph.component';
import { NodeModalComponent } from './components/node-modal/node-modal.component';
import { FilterPanelComponent } from './components/filter-panel/filter-panel.component';
import { CultureDetailComponent } from './components/culture-detail/culture-detail.component';
import { AboutModalComponent } from './components/about-modal/about-modal.component';
import { ReplacePipe } from './pipes/replace.pipe';

@NgModule({
  declarations: [
    AppComponent,
    GenealogyGraphComponent,
    NodeModalComponent,
    FilterPanelComponent,
    CultureDetailComponent,
    AboutModalComponent,
    ReplacePipe
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatChipsModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatCheckboxModule,
    MatMenuModule
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
