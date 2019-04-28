import { TestBed } from '@angular/core/testing';

import { NgxExcelService } from './ngx-excel.service';

describe('NgxExcelService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: NgxExcelService = TestBed.get(NgxExcelService);
    expect(service).toBeTruthy();
  });
});
