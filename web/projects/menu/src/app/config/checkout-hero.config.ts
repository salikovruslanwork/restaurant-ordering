import { DialogTone } from '@shared/ui';
import { CheckoutStep, type CheckoutHero } from '@menu/models/checkout.model';

const REVIEW_HERO: CheckoutHero = { title: 'Review your order', icon: 'error', tone: null };

export const CHECKOUT_HEROES: Record<CheckoutStep, CheckoutHero> = {
  [CheckoutStep.Idle]: REVIEW_HERO,
  [CheckoutStep.Review]: REVIEW_HERO,
  [CheckoutStep.Submitting]: REVIEW_HERO,
  [CheckoutStep.Conflict]: {
    title: 'Some items changed',
    icon: 'published_with_changes',
    tone: DialogTone.Warning
  },
  [CheckoutStep.Success]: {
    title: 'Order placed',
    icon: 'check_circle',
    tone: DialogTone.Success
  },
  [CheckoutStep.Error]: {
    title: 'We couldn’t place your order',
    icon: 'error',
    tone: DialogTone.Error
  }
};

export const CHECKOUT_CONNECTION_ICON = 'cloud_off';
