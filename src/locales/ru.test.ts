import { describe, expect, it } from 'vitest';
import ru from './ru.json';

const HOME_FEATURES = ['security', 'speed', 'servers', 'devices', 'privacy', 'support'];
const HOME_STEPS = ['register', 'choose', 'connect'];
const HOME_STATS = ['servers', 'devices', 'uptime'];
const HOME_WHY_ITEMS = ['noLogs', 'modernProtocols', 'unlimited', 'support'];

const REQUIRED_TRANSLATIONS = [
  'common.units.perGb',
  'common.units.perMonthTraffic',
  'common.units.perWeekTraffic',
  'common.units.perDayTraffic',
  'subscription.connection.addAnotherDevice',
  'home.meta.title',
  'home.header.cabinet',
  'home.header.cabinetShort',
  'home.hero.badge',
  'home.hero.titleLead',
  'home.hero.titleAccent',
  'home.hero.subtitle',
  'home.hero.ctaPrimary',
  'home.hero.ctaSecondary',
  'home.features.title',
  'home.features.subtitle',
  'home.steps.title',
  'home.steps.subtitle',
  'home.why.title',
  'home.why.subtitle',
  'home.cta.title',
  'home.cta.subtitle',
  'home.cta.primary',
  'home.cta.secondary',
  'home.pricing.title',
  'home.pricing.subtitle',
  'home.pricing.gb',
  'home.pricing.unlimited',
  'home.pricing.devices_one',
  'home.pricing.devices_few',
  'home.pricing.devices_many',
  'home.pricing.devices_other',
  'home.pricing.from',
  'home.pricing.daily',
  'home.pricing.perDay',
  'home.pricing.perMonth',
  'home.pricing.select',
  'home.pricing.cta',
  ...HOME_STATS.flatMap((key) => [`home.stats.${key}.value`, `home.stats.${key}.label`]),
  ...HOME_FEATURES.flatMap((key) => [
    `home.features.items.${key}.title`,
    `home.features.items.${key}.description`,
  ]),
  ...HOME_STEPS.flatMap((key) => [
    `home.steps.items.${key}.title`,
    `home.steps.items.${key}.description`,
  ]),
  ...HOME_WHY_ITEMS.map((key) => `home.why.items.${key}`),
];

function getTranslation(path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (value, key) =>
        value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined,
      ru,
    );
}

describe('обязательные русские переводы', () => {
  it.each(REQUIRED_TRANSLATIONS)('%s существует и не пуст', (key) => {
    const value = getTranslation(key);
    expect(value, `Отсутствует перевод ${key}`).toEqual(expect.any(String));
    expect((value as string).trim(), `Пустой перевод ${key}`).not.toBe('');
  });
});
