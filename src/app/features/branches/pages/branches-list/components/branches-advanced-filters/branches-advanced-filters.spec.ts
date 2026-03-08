import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BranchesAdvancedFilters } from './branches-advanced-filters';

describe('BranchesAdvancedFilters', () => {
  let component: BranchesAdvancedFilters;
  let fixture: ComponentFixture<BranchesAdvancedFilters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BranchesAdvancedFilters]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BranchesAdvancedFilters);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
