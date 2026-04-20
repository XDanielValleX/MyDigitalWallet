// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: "AIzaSyC3LJQ_SfoTk5vzpWhvro8psiHnoeNL1SY",
    authDomain: "mydigitalwallet-d46ef.firebaseapp.com",
    projectId: "mydigitalwallet-d46ef",
    storageBucket: "mydigitalwallet-d46ef.firebasestorage.app",
    messagingSenderId: "3239260508",
    appId: "1:3239260508:web:139a7077cb9bfdb6ec9199",
    measurementId: "G-BR3ZVXPBMY"
  },
  googleAuth: {
    // OAuth 2.0 Web client ID (required for Android + Web Google Sign-In)
    // Derived from android/app/google-services.json (client_type: 3)
    webClientId: "3239260508-66e2p5utqen2hl3raq600ficit757av2.apps.googleusercontent.com"
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
