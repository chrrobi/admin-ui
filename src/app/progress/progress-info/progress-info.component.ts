import { Component, OnInit, Input, ViewChild, OnDestroy } from '@angular/core';
import { ClrModal } from '@clr/angular';
import { Progress } from 'src/app/data/progress';
import { timeSince } from 'src/app/utils';

@Component({
  selector: 'progress-info',
  templateUrl: './progress-info.component.html',
  styleUrls: ['./progress-info.component.scss']
})
export class ProgressInfoComponent implements OnInit{
  public infoOpen: boolean = false;

  public selectedScenarios = [];

  @Input()
  public progress: Progress = new Progress();

  @Input()
  public pause: Function;

  public timeSince = timeSince;

  @ViewChild("infoModal") infoModal: ClrModal;

  constructor(
  ) { 
    
  }

  ngOnInit(): void {
  }

  public openModal(): void {
    this.infoModal.open();
    this.pause(true);
  }

  get open() {
    return this.infoOpen;
  }
  
  set open(value: boolean) {
    this.infoOpen = value;
    if (!this.infoOpen) {
      this.pause(false);
    }
  }

}
