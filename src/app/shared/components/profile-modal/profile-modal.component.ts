import { Component, Injector, OnInit, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, EmailAuthProvider, reauthenticateWithCredential, signOut } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { NativeBiometric } from 'capacitor-native-biometric';
import { AlertController, ModalController } from '@ionic/angular';
import { NotificationService } from '../../../core/services/notification';
import { UserService } from '../../../core/services/user';
import {
    cameraOutline,
    closeOutline,
    fingerPrintOutline,
    logOutOutline,
    moonOutline,
    notificationsOutline,
    personOutline
} from 'ionicons/icons';

@Component({
    selector: 'app-profile-modal',
    templateUrl: './profile-modal.component.html',
    styleUrls: ['./profile-modal.component.scss'],
    host: { class: 'ion-page' },
    standalone: false
})
export class ProfileModalComponent implements OnInit {
    readonly closeIcon = closeOutline;
    readonly cameraIcon = cameraOutline;
    readonly personIcon = personOutline;
    readonly fingerIcon = fingerPrintOutline;
    readonly logoutIcon = logOutOutline;
    readonly moonIcon = moonOutline;
    readonly notificationsIcon = notificationsOutline;

    isLoading = false;
    isSaving = false;
    isUpdatingBiometrics = false;
    isUpdatingPush = false;

    firstName = '';
    lastName = '';
    biometricsEnabled = false;
    darkMode = false;

    notificationsPermissionGranted = true;
    pushEnabled = true;

    constructor(
        private auth: Auth,
        private firestore: Firestore,
        private modalCtrl: ModalController,
        private alertCtrl: AlertController,
        private router: Router,
        private userService: UserService,
        private notify: NotificationService,
        private injector: Injector
    ) { }

    ngOnInit() {
        this.darkMode = this.userService.getEffectiveIsDark();
        void this.loadProfile();
    }

    private async refreshNotificationsPermissionStatus(): Promise<void> {
        this.notificationsPermissionGranted = await this.userService.isNotificationsPermissionGranted();
    }

    async onPushToggle(ev: CustomEvent) {
        const nextEnabled = Boolean((ev as any)?.detail?.checked);

        if (this.isUpdatingPush) {
            return;
        }

        const user = this.auth.currentUser;
        if (!user) {
            this.pushEnabled = false;
            await this.notify.error('You must be logged in.');
            return;
        }

        this.isUpdatingPush = true;
        try {
            if (!nextEnabled) {
                const alert = await this.alertCtrl.create({
                    header: 'Desactivar notificaciones',
                    message: '¿Seguro que deseas desactivar las notificaciones? Puedes activarlas nuevamente cuando quieras.',
                    buttons: [
                        { text: 'Cancelar', role: 'cancel' },
                        { text: 'Desactivar', role: 'confirm' }
                    ],
                    backdropDismiss: false,
                });

                await alert.present();
                const result = await alert.onDidDismiss();
                if (result.role !== 'confirm') {
                    // Revert UI toggle.
                    this.pushEnabled = true;
                    return;
                }

                this.pushEnabled = false;
                await this.persistPushEnabled(user.uid, false);
                await this.refreshNotificationsPermissionStatus();
                await this.notify.info('Notificaciones desactivadas.');
                return;
            }

            // Request OS permissions needed to actually DISPLAY the notification (especially in foreground).
            if (Capacitor.isNativePlatform()) {
                await LocalNotifications.requestPermissions().catch(() => { });
            }
            await this.userService.ensurePushToken(user.uid).catch(() => null);

            await this.refreshNotificationsPermissionStatus();

            this.pushEnabled = true;
            await this.persistPushEnabled(user.uid, true);
            await this.notify.success('Notificaciones activadas.');
        } finally {
            this.isUpdatingPush = false;
        }
    }

    private async persistPushEnabled(uid: string, enabled: boolean): Promise<void> {
        const userRef = runInInjectionContext(this.injector, () => doc(this.firestore, `users/${uid}`));
        await runInInjectionContext(this.injector, () => setDoc(
            userRef,
            {
                pushEnabled: enabled,
                updatedAt: new Date().toISOString()
            },
            { merge: true }
        ));
    }

    onDarkModeChanged(ev: CustomEvent) {
        const checked = Boolean((ev as any)?.detail?.checked);
        this.darkMode = checked;
        this.userService.setDarkEnabled(checked);
    }

    async onBiometricsToggle(ev: CustomEvent) {
        const nextEnabled = Boolean((ev as any)?.detail?.checked);

        if (this.isUpdatingBiometrics) {
            return;
        }

        const user = this.auth.currentUser;
        if (!user) {
            this.biometricsEnabled = false;
            await this.notify.error('You must be logged in.');
            return;
        }

        this.isUpdatingBiometrics = true;
        try {
            if (nextEnabled) {
                const ok = await this.enableBiometrics(user.uid);
                this.biometricsEnabled = ok;
            } else {
                const ok = await this.disableBiometrics(user.uid);
                this.biometricsEnabled = !ok;
            }
        } finally {
            this.isUpdatingBiometrics = false;
        }
    }

    get fullName(): string {
        const full = `${this.firstName} ${this.lastName}`.trim();
        return full || 'User';
    }

    async close() {
        await this.modalCtrl.dismiss(null, 'close');
    }

    private async loadProfile() {
        const user = this.auth.currentUser;
        if (!user) {
            return;
        }

        this.isLoading = true;
        try {
            const userRef = runInInjectionContext(this.injector, () => doc(this.firestore, `users/${user.uid}`));
            const snap = await runInInjectionContext(this.injector, () => getDoc(userRef));
            const data = snap.exists() ? (snap.data() as any) : {};

            this.firstName = data.firstName ?? '';
            this.lastName = data.lastName ?? '';
            this.biometricsEnabled = Boolean(data.biometricsEnabled);
            this.pushEnabled = data.pushEnabled !== false;

            await this.refreshNotificationsPermissionStatus();
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            this.isLoading = false;
        }
    }

    async saveChanges() {
        const user = this.auth.currentUser;
        if (!user) {
            return;
        }

        this.isSaving = true;
        try {
            const userRef = runInInjectionContext(this.injector, () => doc(this.firestore, `users/${user.uid}`));
            await runInInjectionContext(this.injector, () => setDoc(
                userRef,
                {
                    firstName: (this.firstName || '').trim(),
                    lastName: (this.lastName || '').trim(),
                    biometricsEnabled: this.biometricsEnabled,
                    pushEnabled: this.pushEnabled,
                    updatedAt: new Date().toISOString()
                },
                { merge: true }
            ));

            await this.modalCtrl.dismiss({ updated: true }, 'saved');
        } catch (error) {
            console.error('Error saving profile:', error);
        } finally {
            this.isSaving = false;
        }
    }

    async logout() {
        try {
            await runInInjectionContext(this.injector, () => signOut(this.auth));
        } finally {
            await this.modalCtrl.dismiss(null, 'logout');
            await this.router.navigate(['/login']).catch(() => window.location.assign('/login'));
        }
    }

    private biometricServerFor(uid: string): string {
        // Namespace credentials per-user to avoid cross-account collisions.
        return `mydigitalwallet:${uid}`;
    }

    private async promptPasswordForEnrollment(): Promise<string | null> {
        let password = '';

        const alert = await this.alertCtrl.create({
            header: 'Confirm Password',
            message: 'Enter your password to enable biometrics for payments.',
            inputs: [
                {
                    name: 'password',
                    type: 'password',
                    placeholder: 'Password',
                    attributes: {
                        autocapitalize: 'off',
                        autocomplete: 'current-password',
                    }
                }
            ],
            buttons: [
                {
                    text: 'Cancel',
                    role: 'cancel'
                },
                {
                    text: 'Continue',
                    role: 'confirm',
                    handler: (data) => {
                        password = String((data as any)?.password ?? '');
                    }
                }
            ],
            backdropDismiss: false,
        });

        await alert.present();
        const result = await alert.onDidDismiss();

        if (result.role !== 'confirm') {
            return null;
        }

        if (!password) {
            await this.notify.error('Password is required.');
            return null;
        }

        return password;
    }

    private async persistBiometricsEnabled(uid: string, enabled: boolean): Promise<void> {
        const userRef = runInInjectionContext(this.injector, () => doc(this.firestore, `users/${uid}`));
        await runInInjectionContext(this.injector, () => setDoc(
            userRef,
            {
                biometricsEnabled: enabled,
                updatedAt: new Date().toISOString()
            },
            { merge: true }
        ));
    }

    private async enableBiometrics(uid: string): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) {
            await this.notify.error('Biometrics are only available on a device.');
            return false;
        }

        const available = await NativeBiometric.isAvailable({ useFallback: true })
            .catch(() => ({ isAvailable: false } as any));

        if (!available?.isAvailable) {
            await this.notify.error('Biometrics not available on this device.');
            return false;
        }

        const user = this.auth.currentUser;
        const email = user?.email;
        if (!user || !email) {
            await this.notify.error('No email found for this account.');
            return false;
        }

        const password = await this.promptPasswordForEnrollment();
        if (!password) {
            await this.notify.info('Biometrics not enabled.');
            return false;
        }

        try {
            await runInInjectionContext(this.injector, () => reauthenticateWithCredential(
                user,
                EmailAuthProvider.credential(email, password)
            ));
        } catch {
            await this.notify.error('Invalid password.');
            return false;
        }

        const server = this.biometricServerFor(uid);

        try {
            await NativeBiometric.setCredentials({
                username: email,
                password,
                server
            });
        } catch (error) {
            console.error('NativeBiometric.setCredentials failed:', error);
            await this.notify.error('Could not store credentials on this device.');
            return false;
        }

        try {
            await this.persistBiometricsEnabled(uid, true);
        } catch (error) {
            console.error('Error enabling biometrics:', error);
            try {
                await NativeBiometric.deleteCredentials({ server });
            } catch {
                // ignore rollback failure
            }
            await this.notify.error('Could not enable biometrics. Please try again.');
            return false;
        }

        await this.notify.success('Biometrics enabled.');
        return true;
    }

    private async disableBiometrics(uid: string): Promise<boolean> {
        const server = this.biometricServerFor(uid);

        if (Capacitor.isNativePlatform()) {
            await NativeBiometric.deleteCredentials({ server }).catch((error) => {
                console.warn('NativeBiometric.deleteCredentials failed:', error);
            });
        }

        try {
            await this.persistBiometricsEnabled(uid, false);
        } catch (error) {
            console.error('Error disabling biometrics:', error);
            await this.notify.error('Could not disable biometrics. Please try again.');
            return false;
        }

        await this.notify.info('Biometrics disabled.');
        return true;
    }
}
