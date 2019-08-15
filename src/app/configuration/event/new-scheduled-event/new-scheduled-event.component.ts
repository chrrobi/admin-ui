import { Component, OnInit, ViewChild } from '@angular/core';
import { ClrWizard, ClrSignpost, ClrSignpostContent } from '@clr/angular';
import { ScheduledEvent } from 'src/app/data/scheduledevent';
import { Scenario } from 'src/app/data/scenario';
import { ScenarioService } from 'src/app/data/scenario.service';
import { EnvironmentService } from 'src/app/data/environment.service';
import { combineAll, concatMap, map, filter } from 'rxjs/operators';
import { Environment } from 'src/app/data/environment';
import { from, of } from 'rxjs';
import { EnvironmentAvailability } from 'src/app/data/environmentavailability';
import { ScheduledeventService } from 'src/app/data/scheduledevent.service';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { DlDateTimePickerChange } from 'angular-bootstrap-datetimepicker';

@Component({
  selector: 'new-scheduled-event',
  templateUrl: './new-scheduled-event.component.html',
  styleUrls: ['./new-scheduled-event.component.scss']
})
export class NewScheduledEventComponent implements OnInit {
  public wzOpen: boolean = false;
  public se: ScheduledEvent = new ScheduledEvent();
  public scenarios: Scenario[] = [];

  public saving: boolean = false;

  public tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  public times: string[] = [];

  public availableEnvironments: EnvironmentAvailability[] = [];
  public checkingEnvironments: boolean = true;
  public environments: Environment[] = [];
  public keyedEnvironments: Map<string, Environment> = new Map();
  public selectedEnvironments: EnvironmentAvailability[] = [];

  public startDate: string;
  public endDate: string;
  public startTime: string;
  public endTime: string;

  public validTimes: boolean = false;

  public vmtotals: Map<string, number> = new Map();

  public selectedscenarios: Scenario[] = [];

  constructor(
    public ss: ScenarioService,
    public ses: ScheduledeventService,
    public es: EnvironmentService
  ) { }

  public eventDetails: FormGroup = new FormGroup({
    'event_name': new FormControl(this.se.event_name, [
      Validators.required,
      Validators.minLength(4)
    ]),
    'description': new FormControl(this.se.description, [
      Validators.required,
      Validators.minLength(4)
    ]),
    'access_code': new FormControl(this.se.access_code, [
      Validators.required,
      Validators.minLength(5),
      Validators.pattern(/^[a-zA-Z0-9]*$/)
    ])
  })

  public copyEventDetails() {
    this.se.event_name = this.eventDetails.get('event_name').value;
    this.se.description = this.eventDetails.get('description').value;
    this.se.access_code = this.eventDetails.get('access_code').value;
  }

  @ViewChild("wizard") wizard: ClrWizard;
  @ViewChild("startTimeSignpost") startTimeSignpost: ClrSignpostContent;
  @ViewChild("endTimeSignpost") endTimeSignpost: ClrSignpostContent;

  public scenariosSelected(s: Scenario[]) {
    this.se.scenarios = [];
    s.forEach(
      (sc: Scenario) => this.se.scenarios.push(sc.id)
    )
  }

  public getTemplates(env: string) {
    return Object.keys(this.keyedEnvironments.get(env).template_mapping);
  }

  public getTotals() {
    return Object.entries(this.vmtotals);
  }

  public setVMCount(env: string, template: string, count: number) {
    count == null ? 0 : count; // handle zeroes
    this.se.required_vms.set(env, new Map().set(template, count));
  }

  public logse() {
    console.log(this.se);
  }

  ngOnInit() {
    this.se = new ScheduledEvent();
    this.se.required_vms = new Map();

    this.ss.list()
      .subscribe(
        (s: Scenario[]) => this.scenarios = s
      );

    // setup the times
    ["00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23"].forEach(
      (hr: string) => {
        ["00", "30"].forEach(
          (min: string) => {
            this.times.push(hr + ":" + min);
          }
        )
      }
    )
  }

  // get all environments
  // for each environment, ask for available resources between start and end time
  // display those results
  public checkEnvironments() {
    this.checkingEnvironments = true;
    var templates: Map<string, boolean> = new Map();

    // add all chosen templates to the list
    this.selectedscenarios.forEach(
      (s: Scenario) => {
        s.virtualmachines.forEach(
          (se: Map<string, string>) => {
            Object.entries(se).forEach(
              (ee: string[]) => templates.set(ee[1], true)
            )
          }
        )
      }
    )

    this.es.list()
      .pipe(
        concatMap((e: Environment[]) => {
          this.environments = e;
          return from(e);
        }),
        filter((e: Environment) => {
          // first add to keyed environment, regardless of if we use it or not
          this.keyedEnvironments.set(e.display_name, e);
          let pass = false;
          Object.keys(e.template_mapping).forEach(
            (s: string) => {
              if (templates.has(s)) {
                pass = true;
              } else {
                pass = pass;
              }
            }
          )
          return pass;
        }),
        concatMap((e: Environment) => {
          return this.es.available(e.display_name, this.se.start_time, this.se.end_time);
        }),
        map(
          (ea: EnvironmentAvailability) => {
            return of(ea);
          }
        ),
        combineAll()
      ).subscribe(
        (ea: EnvironmentAvailability[]) => {
          this.availableEnvironments = ea;
          this.checkingEnvironments = false;
        }
      )
  }

  public prepareEnvironments() {
    // get a list of environments we are using
    // from that list, we will n eed to ask the user how many of each associated VM type they would like
  }


  public setStartTime(d: DlDateTimePickerChange<Date>) {
    this.se.start_time = d.value;
    this.startTimeSignpost.close();
  }

  public setEndTime(d: DlDateTimePickerChange<Date>) {
    this.se.end_time = d.value;
    this.endTimeSignpost.close();
  }

  public open() {
    console.log(this.se);
    this.validTimes = false;
    this.se = new ScheduledEvent();
    this.eventDetails.reset();
    this.se.required_vms = new Map();
    this.selectedEnvironments = [];
    this.selectedscenarios = [];
    this.startDate = this.startTime = this.endDate = this.endTime = "";
    this.wizard.reset();
    this.wizard.open();
  }

  public save() {
    this.saving = true;
    this.ses.create(this.se)
    .subscribe(
      (reply: string) => {
        console.log(reply);
      },
      (err: any) => {
        // something went wrong
      }
    )
  }

}
