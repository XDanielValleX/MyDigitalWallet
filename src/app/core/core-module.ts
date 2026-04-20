import { NgModule, Optional, SkipSelf } from '@angular/core';

@NgModule({
  // CoreModule is for singleton services/guards.
  // Most services use `providedIn: 'root'`, but we keep this module to satisfy
  // the project structure and to prevent accidental multiple imports.
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule | null) {
    if (parentModule) {
      throw new Error('CoreModule is already loaded. Import it in AppModule only.');
    }
  }
}
