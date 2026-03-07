import { effect, signal } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { CultureService, FilterOptions } from './culture.service';

describe('CultureService', () => {
  let service: CultureService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CultureService],
    });
    service = TestBed.inject(CultureService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should avoid feedback loop when updateFilters is called from an effect', fakeAsync(() => {
    const trigger = signal<Partial<FilterOptions>>({});
    let runs = 0;

    const ref = TestBed.runInInjectionContext(() =>
      effect(
        () => {
          const nextFilters = trigger();
          runs += 1;
          service.updateFilters(nextFilters);
        },
        { allowSignalWrites: true },
      ),
    );

    tick();
    expect(runs).toBe(1);

    trigger.set({ strain: 'STR-1' });
    tick();
    expect(runs).toBe(2);

    trigger.set({ minViability: 50 });
    tick();
    expect(runs).toBe(3);

    ref.destroy();
  }));
});
