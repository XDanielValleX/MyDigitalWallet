import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  standalone: false
})
export class CardComponent implements OnInit, OnChanges {
  @Input() cardNumber: string = '**** **** **** ****';
  @Input() cardHolder: string = 'NOMBRE APELLIDO';
  @Input() expDate: string = 'MM/YY';
  @Input() isActive: boolean = true; // Para opacar la tarjeta si no está seleccionada

  cardType: string = 'unknown';

  ngOnInit() {
    this.detectCardType();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cardNumber']) {
      this.detectCardType();
    }
  }

  // Detecta la franquicia basándose en las reglas del Notion
  detectCardType() {
    const cleanNumber = this.cardNumber.replace(/\s+/g, ''); // Quita espacios

    if (cleanNumber.startsWith('4')) {
      this.cardType = 'visa';
    } else if (
      /^(5[1-5])/.test(cleanNumber) || // Rango 51 - 55
      /^(222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)/.test(cleanNumber) // Rango 2221 - 2720
    ) {
      this.cardType = 'mastercard';
    } else {
      this.cardType = 'unknown';
    }
  }

  // Enmascara el número mostrando solo los últimos 4 dígitos
  get maskedNumber(): string {
    const cleanNumber = this.cardNumber.replace(/\s+/g, '');
    if (cleanNumber.length >= 14) {
      const last4 = cleanNumber.slice(-4);
      return `**** **** **** ${last4}`;
    }
    return this.cardNumber;
  }
}