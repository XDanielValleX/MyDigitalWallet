import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CardService {

  constructor() { }

  // Implementación estricta del Algoritmo de Luhn
  isValidLuhn(cardNumber: string): boolean {
    // Quitamos los espacios
    const digits = cardNumber.replace(/\D/g, '');
    if (!digits || digits.length < 13) return false;

    let sum = 0;
    let isSecond = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let d = parseInt(digits[i], 10);
      if (isSecond) {
        d = d * 2;
        if (d > 9) {
          d -= 9;
        }
      }
      sum += d;
      isSecond = !isSecond;
    }
    return (sum % 10) === 0;
  }
}