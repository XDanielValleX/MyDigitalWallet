import { Component, Input } from '@angular/core';

export type SkeletonVariant = 'home' | 'card' | 'transactions';

@Component({
  selector: 'app-skeleton-loading',
  templateUrl: './skeleton-loading.component.html',
  standalone: false
})
export class SkeletonLoadingComponent {
  @Input() variant: SkeletonVariant = 'home';
  @Input() count = 3;

  get items(): number[] {
    const size = Math.max(1, Number(this.count) || 1);
    return Array.from({ length: size }, (_, i) => i);
  }
}
