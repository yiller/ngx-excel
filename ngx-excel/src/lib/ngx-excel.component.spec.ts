import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxExcelComponent } from './ngx-excel.component';

describe('NgxExcelComponent', () => {
  let component: NgxExcelComponent;
  let fixture: ComponentFixture<NgxExcelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NgxExcelComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NgxExcelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
