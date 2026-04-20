import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Gesture, GestureController, ModalController } from '@ionic/angular';
import { arrowBackOutline } from 'ionicons/icons';

type RenderCard = {
  card: any;
  key: string;
  realIndex: number;
};

@Component({
  selector: 'app-change-card-modal',
  templateUrl: './change-card-modal.component.html',
  styleUrls: ['./change-card-modal.component.scss'],
  standalone: false
})
export class ChangeCardModalComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() cards: any[] = [];
  @Input() selectedIndex = 0;

  readonly backIcon = arrowBackOutline;

  activeIndex = 0;
  renderIndex = 0;
  renderCards: RenderCard[] = [];

  @ViewChild('viewport', { read: ElementRef }) viewportRef?: ElementRef<HTMLElement>;
  @ViewChild('track', { read: ElementRef }) trackRef?: ElementRef<HTMLElement>;

  private gesture?: Gesture;
  private slideWidth = 0;
  private gap = 16;
  private viewportWidth = 0;
  private currentX = 0;
  private dragStartX = 0;
  private isAnimating = false;

  private onResize = () => {
    this.measure();
    if (this.viewportWidth > 0 && this.slideWidth > 0) {
      this.snapTo(this.renderIndex, false);
    }
  };

  constructor(
    private modalCtrl: ModalController,
    private gestureCtrl: GestureController
  ) { }

  get activeCard(): any | null {
    return this.cards?.[this.activeIndex] ?? null;
  }

  ngOnInit() {
    this.rebuildRenderCards();
    this.activeIndex = this.normalizeRealIndex(this.selectedIndex);
    this.renderIndex = this.getCenteredRenderIndex(this.activeIndex);
  }

  ngAfterViewInit() {
    // No medimos ni “centramos” hasta que el viewport tenga tamaño real.
    // (Al crear el modal, el contenido aún puede estar hidden y offsetWidth=0)
    void this.syncInitialLayout();

    const viewportEl = this.viewportRef?.nativeElement;
    const trackEl = this.trackRef?.nativeElement;
    if (!viewportEl || !trackEl) {
      return;
    }

    this.gesture = this.gestureCtrl.create({
      el: viewportEl,
      threshold: 10,
      gestureName: 'mdw-change-card-swipe',
      onStart: () => {
        if (this.isAnimating) {
          return;
        }
        trackEl.classList.add('is-dragging');
        this.measure();
        this.dragStartX = this.currentX;
      },
      onMove: ev => {
        if (this.isAnimating) {
          return;
        }
        this.setTranslate(this.dragStartX + ev.deltaX);
      },
      onEnd: ev => {
        if (this.isAnimating) {
          return;
        }
        trackEl.classList.remove('is-dragging');

        if ((this.cards?.length ?? 0) <= 1) {
          this.snapTo(this.renderIndex, true);
          return;
        }

        const distance = ev.deltaX;
        const velocity = ev.velocityX;
        const shouldMove = Math.abs(distance) > this.slideWidth * 0.2 || Math.abs(velocity) > 0.3;

        let nextRenderIndex = this.renderIndex;
        if (shouldMove) {
          nextRenderIndex = distance < 0 ? nextRenderIndex + 1 : nextRenderIndex - 1;
        }

        // Con lista triplicada no deberíamos llegar a bordes, pero clamp por seguridad.
        const maxRender = Math.max(0, this.renderCards.length - 1);
        nextRenderIndex = Math.max(0, Math.min(nextRenderIndex, maxRender));
        void this.goToRenderIndex(nextRenderIndex);
      }
    }, true);

    this.gesture.enable(true);
    window.addEventListener('resize', this.onResize, { passive: true });
  }

  ngOnDestroy() {
    this.gesture?.destroy();
    window.removeEventListener('resize', this.onResize);
  }

  trackByRenderCard(index: number, item: RenderCard): string {
    return item.key;
  }

  async close() {
    await this.modalCtrl.dismiss(null, 'cancel');
  }

  async setAsDefault() {
    const card = this.activeCard;
    if (!card) {
      return;
    }

    await this.modalCtrl.dismiss({ cardId: card.id, index: this.activeIndex }, 'selected');
  }

  getBrandLabel(cardNumber: string): string {
    const cleanNumber = String(cardNumber ?? '').replace(/\D/g, '');

    if (cleanNumber.startsWith('4')) {
      return 'Visa';
    }

    if (
      /^(5[1-5])/.test(cleanNumber) ||
      /^(222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)/.test(cleanNumber)
    ) {
      return 'MasterCard';
    }

    return 'Card';
  }

  getLast4(cardNumber: string): string {
    const cleanNumber = String(cardNumber ?? '').replace(/\D/g, '');
    return cleanNumber.length >= 4 ? cleanNumber.slice(-4) : '----';
  }

  private rebuildRenderCards() {
    const cards = this.cards ?? [];
    const n = cards.length;

    if (n <= 0) {
      this.renderCards = [];
      return;
    }

    if (n === 1) {
      this.renderCards = [
        {
          card: cards[0],
          key: `real-${cards[0]?.id ?? 0}`,
          realIndex: 0
        }
      ];
      return;
    }

    // Bucle real: repetimos 3 veces para no tocar bordes nunca.
    // Siempre recentramos al bloque del medio (loop=1).
    const loops = 3;
    const out: RenderCard[] = [];
    for (let loop = 0; loop < loops; loop++) {
      for (let i = 0; i < n; i++) {
        const c = cards[i];
        out.push({
          card: c,
          key: `loop-${loop}-${c?.id ?? i}`,
          realIndex: i
        });
      }
    }

    this.renderCards = out;
  }

  private normalizeRealIndex(index: number): number {
    const n = this.cards?.length ?? 0;
    if (n <= 0) {
      return 0;
    }
    return ((index % n) + n) % n;
  }

  private getCenteredRenderIndex(realIndex: number): number {
    const n = this.cards?.length ?? 0;
    if (n <= 1) {
      return this.normalizeRealIndex(realIndex);
    }

    // loop del medio empieza en n
    return n + this.normalizeRealIndex(realIndex);
  }

  private getRealIndexFromRender(renderIndex: number): number {
    const n = this.cards?.length ?? 0;
    if (n <= 0) {
      return 0;
    }
    return ((renderIndex % n) + n) % n;
  }

  private measure() {
    const viewportEl = this.viewportRef?.nativeElement;
    const trackEl = this.trackRef?.nativeElement;
    if (!viewportEl || !trackEl) {
      return;
    }

    // Importante: si el modal aún no está visible, offsetWidth puede ser 0.
    // En ese caso NO usamos window.innerWidth porque des-centra en desktop.
    this.viewportWidth = viewportEl.offsetWidth;
    if (!this.viewportWidth) {
      return;
    }

    const slideEl = trackEl.querySelector<HTMLElement>('.mdw-change-card-slide');
    if (slideEl) {
      this.slideWidth = slideEl.offsetWidth;
    }

    const computed = getComputedStyle(trackEl);
    const gapValue = parseFloat((computed.columnGap || computed.gap || '').toString());
    if (!Number.isNaN(gapValue) && gapValue > 0) {
      this.gap = gapValue;
    }

    if (!this.slideWidth) {
      this.slideWidth = Math.min(340, Math.round(this.viewportWidth * 0.82));
    }
  }

  private getTargetX(index: number): number {
    return (this.viewportWidth - this.slideWidth) / 2 - index * (this.slideWidth + this.gap);
  }

  private setTranslate(x: number) {
    const trackEl = this.trackRef?.nativeElement;
    if (!trackEl) {
      return;
    }

    this.currentX = x;
    trackEl.style.transform = `translate3d(${x}px, 0, 0)`;
  }

  private snapTo(index: number, animate: boolean) {
    const trackEl = this.trackRef?.nativeElement;
    if (!trackEl) {
      return;
    }

    if (!animate) {
      trackEl.classList.add('no-transition');
      this.setTranslate(this.getTargetX(index));

      // Mantén el flag un poco más para cubrir el repaint + cambio de clases Angular.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => trackEl.classList.remove('no-transition'));
      });
      return;
    }

    this.setTranslate(this.getTargetX(index));
  }

  private waitForTransformTransition(el: HTMLElement): Promise<void> {
    return new Promise(resolve => {
      let done = false;
      const finish = () => {
        if (done) {
          return;
        }
        done = true;
        el.removeEventListener('transitionend', onEnd);
        resolve();
      };

      const onEnd = (ev: TransitionEvent) => {
        if (ev.target !== el) {
          return;
        }
        if (ev.propertyName !== 'transform') {
          return;
        }
        finish();
      };

      el.addEventListener('transitionend', onEnd);
      window.setTimeout(finish, 350);
    });
  }

  private async goToRenderIndex(targetRenderIndex: number) {
    const trackEl = this.trackRef?.nativeElement;
    if (!trackEl) {
      return;
    }

    this.measure();

    const n = this.cards?.length ?? 0;
    const maxRender = Math.max(0, this.renderCards.length - 1);
    const safeTarget = Math.max(0, Math.min(targetRenderIndex, maxRender));

    this.isAnimating = true;
    this.gesture?.enable(false);

    this.renderIndex = safeTarget;
    this.activeIndex = this.getRealIndexFromRender(safeTarget);

    const targetX = this.getTargetX(safeTarget);
    const needsTransition = Math.abs(targetX - this.currentX) > 0.5;
    this.snapTo(safeTarget, needsTransition);

    if (needsTransition) {
      await this.waitForTransformTransition(trackEl);
    }

    // Recentrado invisible al loop del medio para que nunca haya “borde”.
    if (n > 1) {
      const centered = this.getCenteredRenderIndex(this.activeIndex);
      // En una lista triplicada, loop medio está en [n, 2n-1]
      if (this.renderIndex !== centered && this.renderCards.length === n * 3) {
        this.renderIndex = centered;
        this.snapTo(this.renderIndex, false);
      }
    }

    this.isAnimating = false;
    this.gesture?.enable(true);
  }

  private nextFrame(): Promise<void> {
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
  }

  private async syncInitialLayout() {
    // Espera a que el viewport tenga tamaño real y centra 100% correcto.
    for (let i = 0; i < 40; i++) {
      this.measure();
      if (this.viewportWidth > 0 && this.slideWidth > 0) {
        this.snapTo(this.renderIndex, false);
        return;
      }
      await this.nextFrame();
    }
  }
}
