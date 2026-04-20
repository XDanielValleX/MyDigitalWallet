import { Component, ElementRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Auth } from '@angular/fire/auth';
import { CardService } from '../../core/services/card'; // Asegúrate de que la ruta termine en .service
import { arrowBackOutline } from 'ionicons/icons';
import { FirestoreService } from '../../core/services/firestore';
import { ToastService } from '../../core/services/toast';

@Component({
  selector: 'app-add-card',
  templateUrl: './add-card.page.html',
  styleUrls: ['./add-card.page.scss'],
  standalone: false
})
export class AddCardPage implements OnInit {

  cardForm!: FormGroup;
  isLoading: boolean = false;

  // Variables para la vista previa de la tarjeta
  cardNumberVal: string = 'XXXX XXXX XXXX XXXX';
  cardHolderVal: string = 'YOUR NAME';
  expDateVal: string = 'MM/YY';

  cardType: 'visa' | 'mastercard' | 'unknown' = 'unknown';

  readonly backIcon = arrowBackOutline;

  private lastNavUrl: string | null = null;
  private lastNavAt = 0;

  private keyboardBaseHeight = 0;
  private onViewportResize = () => this.updateKeyboardState();

  constructor(
    private fb: FormBuilder,
    private cardService: CardService,
    private auth: Auth,
    private firestoreService: FirestoreService,
    private router: Router,
    private toast: ToastService,
    private elRef: ElementRef<HTMLElement>,
  ) { }

  ngOnInit() {
    this.initForm();
  }

  async backToHome() {
    await this.safeNavigate('/tabs/home');
  }

  ionViewDidEnter() {
    this.keyboardBaseHeight = this.getViewportHeight();
    this.updateKeyboardState();

    window.addEventListener('resize', this.onViewportResize, { passive: true });
    window.visualViewport?.addEventListener('resize', this.onViewportResize, { passive: true });
    window.visualViewport?.addEventListener('scroll', this.onViewportResize, { passive: true });
  }

  ionViewWillLeave() {
    window.removeEventListener('resize', this.onViewportResize);
    window.visualViewport?.removeEventListener('resize', this.onViewportResize);
    window.visualViewport?.removeEventListener('scroll', this.onViewportResize);

    this.elRef.nativeElement.classList.remove('mdw-keyboard-open');
  }

  private async safeNavigate(url: string) {
    const now = Date.now();
    if (this.lastNavUrl === url && now - this.lastNavAt < 600) {
      return;
    }
    this.lastNavUrl = url;
    this.lastNavAt = now;

    try {
      const ok = await this.router.navigateByUrl(url, { replaceUrl: true });
      if (ok) {
        return;
      }
    } catch {
      // Ignore: some emulators/extensions monkey-patch History API.
    }

    // Fallback without touching History.pushState (keeps SPA navigation when History is broken)
    try {
      const ok = await this.router.navigateByUrl(url, { replaceUrl: true, skipLocationChange: true });
      if (ok) {
        return;
      }
    } catch {
      // ignore
    }

    window.location.assign(url);
  }

  private getViewportHeight() {
    return window.visualViewport?.height ?? window.innerHeight;
  }

  private isTextInputFocused(): boolean {
    const active = document.activeElement as HTMLElement | null;
    if (!active) {
      return false;
    }

    const tag = (active.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') {
      return true;
    }

    if (typeof (active as any).closest === 'function' && active.closest('ion-input, ion-textarea')) {
      return true;
    }

    return Boolean(document.querySelector('ion-input input:focus, ion-textarea textarea:focus'));
  }

  private updateKeyboardState() {
    const currentHeight = this.getViewportHeight();
    this.keyboardBaseHeight = Math.max(this.keyboardBaseHeight || 0, currentHeight);

    const delta = Math.max(0, Math.round(this.keyboardBaseHeight - currentHeight));
    const keyboardOpen = delta >= 120 && this.isTextInputFocused();

	// Exponemos la altura del teclado para CSS (web). Se usa para mantener el botón “detrás” del teclado.
	this.elRef.nativeElement.style.setProperty('--mdw-kb-height', `${delta}px`);

    this.elRef.nativeElement.classList.toggle('mdw-keyboard-open', keyboardOpen);
  }

  initForm() {
    this.cardForm = this.fb.group({
      cardHolder: ['', Validators.required],
      cardNumber: ['', [Validators.required, Validators.minLength(19)]],
      expDate: ['', [Validators.required, Validators.minLength(5)]],
      cvv: ['', [Validators.required, Validators.minLength(3)]]
    });

    // Sincronización en tiempo real con la tarjeta visual
    this.cardForm.valueChanges.subscribe(values => {
      this.cardHolderVal = values.cardHolder || 'YOUR NAME';
      // La sincronización del número y fecha la manejamos en los métodos de formato
    });
  }

  private detectCardType(cardNumber: string): 'visa' | 'mastercard' | 'unknown' {
    const cleanNumber = (cardNumber ?? '').replace(/\D/g, '');

    if (cleanNumber.startsWith('4')) {
      return 'visa';
    }

    if (
      /^(5[1-5])/.test(cleanNumber) || // Rango 51 - 55
      /^(222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)/.test(cleanNumber) // Rango 2221 - 2720
    ) {
      return 'mastercard';
    }

    return 'unknown';
  }

  // Formateo en bloques de 4 dígitos y actualización del form
  formatCardNumber(event: any) {
    const rawValue = String(event?.detail?.value ?? event?.target?.value ?? '');

    let input = rawValue.replace(/\D/g, '').substring(0, 16);
    input = input.match(/.{1,4}/g)?.join(' ') || '';

    // Actualizamos el valor en el formulario sin disparar otro evento para evitar bucles
    this.cardForm.patchValue({ cardNumber: input }, { emitEvent: false });
    // Actualizamos la tarjeta visual
    this.cardNumberVal = input || 'XXXX XXXX XXXX XXXX';

    this.cardType = input ? this.detectCardType(input) : 'unknown';
  }

  // Formateo MM/YY y actualización del form
  formatExpDate(event: any) {
    const rawValue = String(event?.detail?.value ?? event?.target?.value ?? '');

    let input = rawValue.replace(/\D/g, '').substring(0, 4);
    if (input.length > 2) {
      input = input.substring(0, 2) + '/' + input.substring(2, 4);
    }

    this.cardForm.patchValue({ expDate: input }, { emitEvent: false });
    this.expDateVal = input || 'MM/YY';
  }

  async saveCard() {
    // 1. Validar campos del formulario reactivo
    if (this.cardForm.invalid) {
      this.showToast('Please fill all fields correctly');
      return;
    }

    // Extraer valores limpios
    const { cardNumber, cardHolder, expDate, cvv } = this.cardForm.value;

    // 2. Regla de Negocio: Algoritmo de Luhn
    if (!this.cardService.isValidLuhn(cardNumber)) {
      this.showToast('Invalid Card Number (Luhn Error)');
      return;
    }

    this.isLoading = true;

    try {
      const user = this.auth.currentUser;
      if (user) {
        await this.firestoreService.addDoc(`users/${user.uid}/cards`, {
          cardNumber: cardNumber,
          cardHolder: cardHolder.toUpperCase(),
          expDate: expDate,
          createdAt: new Date().toISOString()
        });

        this.showToast('Card added successfully!', 'success');
        await this.safeNavigate('/tabs/home');
      }
    } catch (error) {
      this.showToast('Error saving card');
      console.error(error);
    } finally {
      this.isLoading = false;
    }
  }

  async showToast(message: string, color: string = 'danger') {
    await this.toast.show(message, {
      duration: 2000,
      color,
      position: 'top'
    });
  }
}